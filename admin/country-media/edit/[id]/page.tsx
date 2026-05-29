"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Select } from "antd";


export const dynamic = 'force-dynamic';

export default function MediaEnvEdit() {
  const { formProps, saveButtonProps } = useForm({
    resource: "media_environment",
    action: "edit",
    meta: { select: "*,countries(id,iso_a3,name_fr)" },
  });

  const { selectProps: countrySelect } = useSelect({
    resource: "countries",
    optionLabel: "name_fr",
    optionValue: "id",
    sorters: [{ field: "name_fr", order: "asc" }],
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Pays"
          name={["country_id"]}
          rules={[{ required: true }]}
        >
          <Select showSearch {...countrySelect} />
        </Form.Item>

        <Form.Item label="Legal environment" name={["legal_environment"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Media Regulators" name={["media_regulators"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Journalists associations" name={["journalists_associations"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Radio stations" name={["radio_stations"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="TV stations" name={["tv_stations"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Newspapers" name={["newspapers"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="State-owned media" name={["state_owned_media"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="News agency" name={["news_agency"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="International media" name={["international_media"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Online media" name={["online_media"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="State of internet freedom" name={["internet_freedom"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>

        <Form.Item label="Leading media" name={["leading_media"]}>
          <RichTextEditor value={undefined} onChange={undefined} />
        </Form.Item>
      </Form>
    </Edit>
  );
}
