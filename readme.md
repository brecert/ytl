# ytl

`ytl` is a small `htm` like dsl for writing markup in javascript.

It uses javascript's [tagged templates] to to allow for interpolation of values.

## Syntax

The syntax is fairly simple, and is meant to be easier to type than htm.

```slim
// this is a comment
// nodes
div {}

// you can have multiple root nodes
// attributes can be interpolated into for both the key and value
// attributes with no values are possible
div key="value" ${key}=${value} draggable {}

// strings can be used as a value for keys as well
div "this is a key"="foo" {}

// nodes can contain children
// strings can be used as a value
label {
  img {}
  "hello world"
  input {}
}

// attributes can be spread
div ...${props} {}

// children can be spread as well
div {
  ...${children}
}

// components are possible
// where `Button` is a component reference
${Button} type="submit" {}
```

## Features

- no transpiler or build step necessary
- < **400 bytes** (smaller than `htm/mini`!)

## Usage

Since `ytl` is a generic library, we need to tell it what to "compile" our templates to.
You can bind `ytl` to any function of the form `h(type, props, ...children)` _([hyperscript])_.
This function can return anything - `ytl` never looks at the return value.

Here's an example `h()` function that returns tree nodes:

```js
function h(type, props, ...children) {
  return { type, props, children };
}
```

To use our custom `h()` function, we need to create our own `ytml` tag function by binding `ytl` to our `h()` function:

```js
import ytl from '@brecert/ytl';
const ytml = ytl.bind(h);
```

Now we have an `ytml()` template tag that can be used to produce objects in the format we created above.

Here's the whole thing for clarity:

```js
import ytl from '@brecert/ytl';
function h(type, props, ...children) {
  return { type, props, children };
}
const ytml = ytl.bind(h);
console.log( ytml`h1 id=hello { "Hello world!" }` );
// [{
//   type: 'h1',
//   props: { id: 'hello' },
//   children: ['Hello world!']
// }]
```

## Credits

Many thanks to [htm]. This project is heavily based on it, including this readme.

[htm]: https://github.com/developit/htm
[hyperscript]: https://github.com/hyperhype/hyperscript
[tagged templates]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates