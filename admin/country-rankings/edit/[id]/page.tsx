"use client";

import { Edit, useForm } from "@refinedev/antd";        // ✅ depuis @refinedev/antd
import { Form, InputNumber, Select, Spin } from "antd";  // ✅ Form d'antd

export const dynamic = 'force-dynamic';

export default function RankingEdit() {
  // refine va récupérer l'id depuis l'URL ([id]) grâce au router provider
  const { formProps, saveButtonProps, formLoading } = useForm({
    resource: "rankings",
    action: "edit",
    meta: { select: "*,countries(id,iso_a3,name_fr)" },
  });

  // ⚠️ IMPORTANT :
  // - Ne pas retourner null pendant le chargement.
  // - On peut afficher un Spin mais laisser le <Form> monté,
  //   POUR que l'instance fournie par formProps soit bien connectée.
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Spin spinning={formLoading}>
        {/* Liaison explicite de l'instance, au cas où */}
        <Form
          {...formProps}
          form={formProps.form}          // ✅ liaison explicite
          layout="vertical"
        >
          <Form.Item
            label="Pays"
            name={["country_id"]}
            rules={[{ required: true }]}
          >
            {/* Option simple : on laisse l'ID, ou on passera un Select asynchrone si besoin */}
            <Select
              showSearch
              // Variante avec "options" si tu veux précharger la liste de pays via useSelect
              // options={...}
            />
          </Form.Item>

          <Form.Item label="Année" name={["year"]} rules={[{ required: true }]}>
            <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Position"
            name={["position"]}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Score global"
            name={["score_global"]}
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Spin>
    </Edit>
  );
}
