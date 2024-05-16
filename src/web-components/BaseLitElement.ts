import { LitElement, css, unsafeCSS } from "lit";
import style from "../globals.css?inline";

const baseStyle = css`
  :host {
    display: inherit;
    font-family: "Zen Kaku Gothic Antique", sans-serif;
  }
`;

export class BaseLitElement extends LitElement {
  static styles = [unsafeCSS(style), baseStyle];
}
