import React from "react";
import { Layout, type LayoutProps } from "react-admin";
import CustomAppBar from "./CustomAppBar";

export default function CustomLayout(props: LayoutProps) {
  return <Layout {...props} appBar={CustomAppBar} />;
}
