"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Space } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const { Title, Text } = Typography;

export const dynamic = 'force-dynamic';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form] = Form.useForm();

  const handleResetPassword = async (values: { email: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        message.error(error.message);
      } else {
        setEmailSent(true);
        message.success("Un lien de réinitialisation a été envoyé à votre email");
      }
    } catch (err: unknown) {
      message.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <Card style={{ width: 400, textAlign: "center" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <MailOutlined style={{ fontSize: 48, color: "#52c41a" }} />
            <Title level={3}>Email envoyé !</Title>
            <Text type="secondary">
              Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
            </Text>
            <Link href="/admin/login">
              <Button type="link" icon={<ArrowLeftOutlined />}>
                Retour à la connexion
              </Button>
            </Link>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2}>Mot de passe oublié</Title>
            <Text type="secondary">
              Entrez votre email pour recevoir un lien de réinitialisation
            </Text>
          </div>

          <Form
            form={form}
            onFinish={handleResetPassword}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Veuillez entrer votre email" },
                { type: "email", message: "Format d'email invalide" }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="votre-email@exemple.com"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{ width: "100%" }}
              >
                Envoyer le lien de réinitialisation
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Link href="/admin/login">
              <Button type="link" icon={<ArrowLeftOutlined />}>
                Retour à la connexion
              </Button>
            </Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}