import BlockNormalizer from "./blockNormalizer";
import {aSchema} from "../schema/schema";

test('validate 01', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<span>2223</span>334"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});

test('validate 02', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<p>2223</p>334"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(false);
});

test('validate 03', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "<a>2223</a>"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(false);
});

test('validate 04', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "2223"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});


test('validate 05', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<span>2223</span><span>334</span>"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});
