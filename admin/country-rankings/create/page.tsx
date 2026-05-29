"use client";

import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, InputNumber, Select } from "antd";

export const dynamic = 'force-dynamic';

export default function RankingCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "rankings" });

  const { selectProps: countrySelect } = useSelect({
    resource: "countries",
    optionLabel: "name_fr",
    optionValue: "id",
    filters: [{ field: "name_fr", operator: "contains", value: "" }],
    sorters: [{ field: "name_fr", order: "asc" }],
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Pays" name={["country_id"]} rules={[{ required: true }]}>
          <Select showSearch {...countrySelect} />
        </Form.Item>
        <Form.Item label="Année" name={["year"]} rules={[{ required: true }]}>
          <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Position" name={["position"]} rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Score global" name={["score_global"]} rules={[{ required: true }]}>
          <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Create>
  );
}
