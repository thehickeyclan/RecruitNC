import { describe, expect, it } from "vitest"
import { linkNames } from "./link-names"

describe("linkNames", () => {
  const links: Array<[string, string]> = [["Mason Brown", "/athletes/m"], ["Liam Myles", "/athletes/l"], ["Bennett Myles", "/athletes/b"]]
  it("links whole names in text", () => {
    expect(linkNames("<p>Mason Brown beat #6.</p>", links)).toBe('<p><a href="/athletes/m">Mason Brown</a> beat #6.</p>')
  })
  it("leaves existing links and tag attributes alone", () => {
    const h = '<p><a href="/x">Mason Brown</a> and <img alt="Mason Brown"> and Mason Brown</p>'
    expect(linkNames(h, links)).toBe('<p><a href="/x">Mason Brown</a> and <img alt="Mason Brown"> and <a href="/athletes/m">Mason Brown</a></p>')
  })
  it("does not match inside longer words or other names", () => {
    expect(linkNames("<p>Mason Browning, Liam Myles's</p>", links)).toBe('<p>Mason Browning, <a href="/athletes/l">Liam Myles</a>\'s</p>')
  })
  it("adds a class when given", () => {
    expect(linkNames("Bennett Myles", links, "u")).toBe('<a href="/athletes/b" class="u">Bennett Myles</a>')
  })
})
