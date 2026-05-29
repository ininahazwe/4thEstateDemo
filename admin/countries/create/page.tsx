"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

const regions = ["Africa","Americas","Asia","Europe","Oceania"];

export const dynamic = 'force-dynamic';

export default function CountryCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "countries" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="ISO A3" name={["iso_a3"]} rules={[{ required: true, len: 3 }]}>
          <Input maxLength={3} />
        </Form.Item>
        <Form.Item label="Nom (FR)" name={["name_fr"]} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Name (EN)" name={["name_en"]} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Région" name={["region"]}>
          <Select
            allowClear
            options={regions.map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>
      </Form>
    </Create>
  );
}
