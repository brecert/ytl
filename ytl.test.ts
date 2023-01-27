import { assertEquals } from "https://deno.land/std@0.174.0/testing/asserts.ts";

import ytl from "./ytl.js";

type Node = {
  tag: string;
  attrs: Record<string, unknown>;
  children: (Node | string)[];
};

// convenience/example `h` for testing
const ytml = ytl.bind((tag, attrs, ...children): Node => ({
  tag,
  // not efficient but that's fine for this
  attrs: attrs,
  children,
}));

Deno.test("ignores comments", () => {
  const output = ytml`
    // should be ignored
    // this should define a {} b {}, but with comments breaking up b
    a {} // should also be ignored
    b // should be ignored {}
    { c // }
    {} }
  `;
  assertEquals(output, [
    { tag: "a", attrs: {}, children: [] },
    {
      tag: "b",
      attrs: {},
      children: [
        { tag: "c", attrs: {}, children: [] },
      ],
    },
  ]);
});

Deno.test("interpolates values as is", () => {
  const attrsObj = { "objKey": "objVal", "objKey2": "objVal2" };

  const output = ytml`
    a nameKey="strVal" ...${attrsObj} {}
  `;

  assertEquals(output, [
    {
      tag: "a",
      attrs: {
        nameKey: "strVal",
        objKey: "objVal",
        objKey2: "objVal2",
      },
      children: [],
    },
  ]);
});

Deno.test("features - basic", () => {
  const attrsObj = { "objKey": "objVal", "objKey2": "objVal2" };

  const output = ytml`
    // a comment, ignored
    // multiple root nodes
    a {}
    // attributes
    b foo="bar" {}
    // children
    c foo="bar" {
      d {}
      // string children
      "string-child"
    }
    f ${"interpolated key"}=${"interpolated value"} ...${attrsObj} {}
  `;

  assertEquals(output, [
    { tag: "a", attrs: {}, children: [] },
    { tag: "b", attrs: { foo: "bar" }, children: [] },
    {
      tag: "c",
      attrs: { foo: "bar" },
      children: [
        { tag: "d", attrs: {}, children: [] },
        "string-child",
      ],
    },
    {
      tag: "f",
      attrs: {
        "interpolated key": "interpolated value",
        objKey: "objVal",
        objKey2: "objVal2",
      },
      children: [],
    },
  ]);
});
