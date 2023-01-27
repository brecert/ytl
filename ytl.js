/// <reference types="./ytl.d.ts" />
// deno-lint-ignore-file no-this-alias prefer-const

// syntax:
// root = nodes
// node = value (attr | merge)+ '{' nodes '}'
// attr = value ('=' value)?
// name = [\w_-]+
// merge = '...' value
// nodes = (node | merge | $input)*
// value = string | name | $input

const TOKENS = /([\w_-]+)|(?:"([^]*?)")|(\/\/.*)|(\s+)|(\.\.\.)|(.)/g;
//              ^ name    ^ string     ^ comment ^ ws  ^ dots   ^ symbol

const
  /** unquoted names, like 'foo', 'bar', 'hello-world' */
  TokenName = 1,
  /** quoted values, like '"foo"', '"hello world"' */
  TokenString = 2,
  /** comments, like '// ignore this' */
  TokenComment = 3,
  /** whitespace, like ' ', '\n' */
  TokenWhitespace = 4,
  /** dots, used to indicate that a value should be merged into the current one instead of appended */
  TokenDots = 5,
  /** anything else that wasn't already matched */
  TokenSymbol = 6;

// todo: benchmark if iterating and filtering in the loop is faster than here, it probably is.
// it may reduce byte size as well
/** @param {string} string */
const lex = (string) =>
  [...string.matchAll(TOKENS)]
    .filter((t) => !t[TokenWhitespace]);

const
  ModeTag = 0,
  ModeAttrKey = 1,
  ModeAttrVal = 2,
  ModeNodesMerge = 3,
  ModeAttrsMerge = 4;

/**
 * @param {string[]} strings 
 * @param  {...unknown} values - the interpolated values to insert
 */
export default function ytl(strings, ...values) {
  const h = this;
  // the current parsing/insertion mode
  let mode = ModeTag;
  // last node will be the current node that is being parsed
  let nodes = [];
  // current attribute [key, value]
  let attr = [, ,];
  // we use this stack of nodes to keep track of what node to append to when parsing of a node is finished 
  let parents = [nodes];

  /**
   * @param {unknown} value
   * @param {unknown} [token]
   */
  const handleMode = (value, token) => {
    const current = nodes.at(-1);
    // we use a table here to switch because bree think's it *may* be faster (benchmarks needed)
    ({
      [ModeTag]: () => {
        if (!token) {
          // if there's no token then we're interpolating a value as a tag
          // this is what allows components to work
          parents.at(-1).push([value, []]);
          mode = ModeAttrKey;
        } else if (token[TokenDots]) {
          mode = ModeNodesMerge;
        } else if (token[TokenString]) {
          // convenience for strings so we don't need to `...` to merge them every time
          nodes[nodes.length - 1] = current.concat(value);
          mode = ModeTag;
        } else if (token[TokenSymbol] === "}") {
          // put the child into the new (old) current node
          // todo: error?
          parents.pop();
          const child = nodes.pop();
          // apply might be better here to reduce cost of destructing + argument stack
          parents.at(-1).push(h(...child));
        } else {
          nodes.push([value, []]);
          mode = ModeAttrKey;
        }
      },
      [ModeAttrKey]: () => {
        if (!token || token[TokenName] || token[TokenString]) {
          attr = [value, undefined];
          current[1].push(attr);
        } else if (token[TokenSymbol] === "{") {
          parents.push(current);
          mode = ModeTag;
        } else if (token[TokenSymbol] === "=") {
          mode = ModeAttrVal;
        } else if (token[TokenDots]) {
          mode = ModeAttrsMerge;
        }
        // todo: error?
      },
      [ModeAttrVal]: () => {
        // todo: error if invalid syntax?
        attr[1] = value;
        mode = ModeAttrKey;
      },
      [ModeNodesMerge]: () => {
        // todo: error?
        nodes[nodes.length - 1] = current.concat(value);
        mode = ModeTag;
      },
      [ModeAttrsMerge]: () => {
        current[1] = current[1].concat(value);
        mode = ModeAttrKey;
      },
    })[mode]();
  };

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];
    const tokens = lex(string);

    for (const token of tokens) {
      if (token[TokenComment]) continue;
      // todo: change structure so this isn't needed
      handleMode(token.slice(1).find((_) => _), token);
    }

    const value = values[i];
    if (i < values.length) handleMode(value);
  }

  return nodes;
}
