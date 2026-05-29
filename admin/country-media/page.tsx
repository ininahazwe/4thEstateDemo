"use client";

import { List, EditButton, CreateButton, useTable } from "@refinedev/antd";
import { Table } from "antd";

export const dynamic = 'force-dynamic';

type Row = {
  id: number;
  country_id: number;
  countries?: { id: number; iso_a3: string; name_fr: string } | null;
  updated_at: string | null;
};

export default function MediaEnvList() {
  const { tableProps } = useTable<Row>({
    resource: "media_environment",
    meta: { select: "id,country_id,updated_at,countries(id,iso_a3,name_fr)" },
    pagination: { pageSize: 20 },
  });

  return (
    <List headerButtons={<CreateButton />}>
      <Table rowKey="id" {...tableProps}>
        <Table.Column<Row>
          title="Pays"
          render={(_, r) => <span>{r.countries?.iso_a3} — {r.countries?.name_fr}</span>}
        />
        <Table.Column dataIndex="updated_at" title="Mis à jour" />
        <Table.Column<Row>
          title="Actions"
          render={(_, r) => <EditButton size="small" recordItemId={r.id} />}
        />
      </Table>
    </List>
  );
}
