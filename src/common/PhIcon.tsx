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
  const [local, rest] = splitProps(props, ["name", "class"]);

  return <Dynamic component={getPhIconElementName(local.name)} class={local.class ? `ph-icon ${local.class}` : "ph-icon"} {...rest} />;
}
