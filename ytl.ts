// deno-lint-ignore-file no-this-alias prefer-const

const TOKENS = /([\w_-]+)|(?:"([^]*?)")|(\/\/.*)|(\s+)|(\.\.\.)|(.)/g;
//              ^ name    ^ string     ^ comment ^ ws  ^ dots   ^ symbol

// const enum to become only numbers when transpiled
const enum TokenType {
  Name = 1,
  String,
  Comment,
  Whitespace,
  Dots,
  Symbol,
}

const lex = (string: string) =>
  [...string.matchAll(TOKENS)]
    .filter((t) => !t[TokenType.Whitespace]);

const enum Mode {
  Tag,
  AttrKey,
  AttrVal,
  NodesMerge,
  AttrsMerge,
}

export function ytlBase<T>(
  this: (
    tag: unknown,
    attributes: ([unknown, unknown?] | unknown)[],
    ...children: unknown[]
  ) => T,
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  type Node = [
    tag: unknown,
    attributes: ([unknown, unknown?] | unknown)[],
    ...children: unknown[],
  ];

  const h = this;
  let mode = Mode.Tag;
  let nodes: Node[] = [];
  let attr: [unknown, unknown?] = [] as unknown as [unknown, unknown?];
  let parents: Node[] = [nodes as Node];

  const handleMode = (value: unknown, token?: RegExpMatchArray) => {
    const current = nodes.at(-1)!;
    ({
      [Mode.Tag]: () => {
        // console.log(token?.dots)
        if (!token) {
          parents.at(-1)!.push([value as Node, []]);
          mode = Mode.AttrKey;
        } else if (token[TokenType.Dots]) {
          mode = Mode.NodesMerge;
        } else if (token[TokenType.String]) {
          nodes[nodes.length - 1] = current.concat(value) as Node;
          mode = Mode.Tag;
        } else if (token[TokenType.Symbol] === "}") {
          // put the child into the new (old) current node
          // todo: error?
          parents.pop();
          const child = nodes.pop()!;
          parents.at(-1)!.push(h(...child));
        } else {
          nodes.push([value, []]);
          mode = Mode.AttrKey;
        }
      },
      [Mode.AttrKey]: () => {
        if (!token || token[TokenType.Name] || token[TokenType.String]) {
          attr = [value, undefined];
          current[1].push(attr);
        } else if (token[TokenType.Symbol] === "{") {
          parents.push(current);
          mode = Mode.Tag;
        } else if (token[TokenType.Symbol] === "=") {
          mode = Mode.AttrVal;
        } else if (token[TokenType.Dots]) {
          mode = Mode.AttrsMerge;
        }
        // todo: error?
      },
      [Mode.AttrVal]: () => {
        // todo: error if invalid syntax?
        attr[1] = value;
        mode = Mode.AttrKey;
      },
      [Mode.NodesMerge]: () => {
        // todo: error?
        nodes[nodes.length - 1] = current.concat(value) as Node;
        mode = Mode.Tag;
      },
      [Mode.AttrsMerge]: () => {
        current[1] = current[1].concat(value);
        mode = Mode.AttrKey;
      },
    })[mode]();
  };

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];
    const tokens = lex(string);

    for (const token of tokens) {
      if (token[TokenType.Comment]) continue;
      handleMode(token.slice(1).find((_) => _), token);
    }

    const value = values[i];
    if (i < values.length) handleMode(value);
  }

  return nodes;
}


