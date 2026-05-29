"use client";

import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Typography, message, Space } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const { Title, Text } = Typography;

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Vérifier si on a un token de reset valide
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Définir la session avec les tokens de reset
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
  }, []);

  const handleUpdatePassword = async (values: { password: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) {
        message.error(error.message);
      } else {
        setPasswordReset(true);
        message.success("Mot de passe mis à jour avec succès");
        
        // Rediriger vers la page de login après 2 secondes
        setTimeout(() => {
          router.push("/admin/login");
        }, 2000);
      }
    } catch (err: unknown) {
      message.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (passwordReset) {
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
            <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a" }} />
            <Title level={3}>Mot de passe mis à jour !</Title>
            <Text type="secondary">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
            </Text>
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
            <Title level={2}>Nouveau mot de passe</Title>
            <Text type="secondary">
              Choisissez un nouveau mot de passe sécurisé
            </Text>
          </div>

          <Form
            form={form}
            onFinish={handleUpdatePassword}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="password"
              label="Nouveau mot de passe"
              rules={[
                { required: true, message: "Veuillez entrer un mot de passe" },
                { min: 6, message: "Le mot de passe doit contenir au moins 6 caractères" }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nouveau mot de passe"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirmer le mot de passe"
              dependencies={['password']}
              rules={[
                { required: true, message: "Veuillez confirmer votre mot de passe" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirmer le mot de passe"
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
                Mettre à jour le mot de passe
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Link href="/admin/login">
              <Button type="link">
                Retour à la connexion
              </Button>
            </Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}