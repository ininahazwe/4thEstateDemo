"use client";
import React, { useMemo } from "react";
import { Layout, Menu, type MenuProps } from "antd";
import { useMenu, useGo } from "@refinedev/core";
import Image from "next/image";

export const dynamic = 'force-dynamic';

interface MenuItem {
  key?: string;
  name?: string;
  route?: string;
  icon?: React.ReactNode;
  label?: string;
  children?: MenuItem[];
}

export default function AppSider() {
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const go = useGo();

  const items = useMemo<MenuProps["items"]>(() => {
    const mapItems = (list: MenuItem[]): NonNullable<MenuProps["items"]> =>
      (list ?? []).map((i) => {
        const baseItem = {
          key: i.key ?? i.name ?? i.route ?? '',
          icon: i.icon,
          label: (
            <span
              onClick={() => {
                if (i.route) go({ to: i.route, type: "push" });
              }}
            >
              {i.label ?? i.name}
            </span>
          ),
        };

        if (i.children && i.children.length > 0) {
          return {
            ...baseItem,
            children: i.children.map((c) => ({
              key: c.key ?? c.name ?? c.route ?? '',
              icon: c.icon,
              label: (
                <span onClick={() => c.route && go({ to: c.route, type: "push" })}>
                  {c.label ?? c.name}
                </span>
              ),
            })),
          };
        }

        return baseItem;
      });
    return mapItems(menuItems);
  }, [menuItems, go]);

  return (
    <Layout.Sider width={220} breakpoint="lg" collapsedWidth={64}>
      <div 
        className="logo"
        style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        onClick={() => go({ to: "/admin", type: "push" })}
      >
         <Image 
          src="/logo.png" 
          alt="Logo" 
          width={80} 
          height={40}
          priority
        />
      </div>
      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={defaultOpenKeys}
        items={items}
      />
    </Layout.Sider>
  );
}