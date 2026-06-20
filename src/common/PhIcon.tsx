import { splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { getPhIconElementName, type IconName, type PhIconWeight } from "./phosphorIcons";

type PhIconProps = JSX.HTMLAttributes<HTMLElement> & {
  name: IconName;
  size?: number | string;
  weight?: PhIconWeight;
  color?: string;
};

export function PhIcon(props: PhIconProps) {
  const [local, rest] = splitProps(props, ["name", "class", "size", "style"]);
  const size = toCssSize(local.size);
  const style = mergeIconStyle(size, local.style);

  return <Dynamic component={getPhIconElementName(local.name)} class={local.class ? `ph-icon ${local.class}` : "ph-icon"} style={style} size={local.size} {...rest} />;
}

function toCssSize(size: number | string | undefined): string | undefined {
  if (typeof size === "number") {
    return `${size}px`;
  }

  return size;
}

function mergeIconStyle(size: string | undefined, style: JSX.HTMLAttributes<HTMLElement>["style"]): JSX.HTMLAttributes<HTMLElement>["style"] {
  if (!size) {
    return style;
  }

  const iconStyle: JSX.CSSProperties = {
    display: "inline-flex",
    width: size,
    height: size,
    flex: `0 0 ${size}`,
    "align-items": "center",
    "justify-content": "center"
  };

  if (!style) {
    return iconStyle;
  }

  if (typeof style === "string") {
    return `display:inline-flex;width:${size};height:${size};flex:0 0 ${size};align-items:center;justify-content:center;${style}`;
  }

  return { ...iconStyle, ...style };
}
