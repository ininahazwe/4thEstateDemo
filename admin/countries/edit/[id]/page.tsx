"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, Button, Space } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useState } from "react";

const regions = ["Africa","Americas","Asia","Europe","Oceania"];

export const dynamic = 'force-dynamic';

export default function CountryEdit() {
  const { formProps, saveButtonProps } = useForm({
    resource: "countries",
    action: "edit",
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fonction pour copier le texte
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item 
          label="ISO A3" 
          name="iso_a3" 
          rules={[{ required: true, len: 3 }]}
        >
          <Input maxLength={3} />
        </Form.Item>

        <Form.Item 
          label="Nom (FR)" 
          name="name_fr" 
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item 
          label="Name (EN)" 
          name="name_en" 
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item 
          label="Région" 
          name="region"
        >
          <Select
            allowClear
            options={regions.map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>

        <Form.Item 
          label="Tooltip Info"
          name="tooltip_info"
          rules={[{ 
            max: 200, 
            message: "Maximum 200 characters" 
          }]}
          tooltip="Courte description affichée au survol sur la carte (ex: 'Benin has a controversial digital code')"
        >
          <Input.TextArea 
            rows={3}
            placeholder="Ex: Benin has a controversial digital code"
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Edit>
  );
}