"use client";
import React from "react";
import { Layout, Button, Space, Typography } from "antd";
import { useGetIdentity, useLogout } from "@refinedev/core";

export const dynamic = 'force-dynamic';

export default function AppHeader() {
  const { data: identity } = useGetIdentity<{ id: string; name?: string }>();
  const { mutate: logout } = useLogout();

  return (
    <Layout.Header
      style={{
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "56px",
        marginBottom: 16,
      }}
    >
      <Typography.Title level={4} style={{ margin: 0 }}>
        Admin
      </Typography.Title>

      <Space>
        {identity?.name && (
          <Typography.Text type="secondary">{identity.name}</Typography.Text>
        )}
        <Button onClick={() => logout()}>
          Logout
        </Button>
      </Space>
    </Layout.Header>
  );
}