"use client";

import { List, EditButton, CreateButton, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";

export const dynamic = 'force-dynamic';

type Row = {
  id: number;
  country_id: number;
  year: number;
  position: number;
  score_global: number;
  countries?: { id: number; iso_a3: string; name_fr: string } | null;
};

export default function RankingsList() {
  const { tableProps } = useTable<Row>({
    resource: "rankings",
    meta: {
      // jointure pour afficher ISO + nom
      select: "id,year,position,score_global,country_id,countries(id,iso_a3,name_fr)",
    },
    sorters: { initial: [{ field: "year", order: "desc" }] },
    pagination: { pageSize: 20 },
  });

  return (
    <List headerButtons={<CreateButton />}>
      <Table rowKey="id" {...tableProps}>
        <Table.Column<Row>
          title="Pays"
          render={(_, r) => (
            <span>{r.countries?.iso_a3} — {r.countries?.name_fr}</span>
          )}
        />
        <Table.Column dataIndex="year" title="Année" sorter />
        <Table.Column dataIndex="position" title="Position" sorter />
        <Table.Column<Row>
          title="Score"
          render={(_, r) => <Tag>{Number(r.score_global).toFixed(2)}</Tag>}
        />
        <Table.Column<Row>
          title="Actions"
          render={(_, r) => <EditButton size="small" recordItemId={r.id} />}
        />
      </Table>
    </List>
  );
}
