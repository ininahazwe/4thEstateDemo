"use client";

import { List, EditButton, CreateButton, useTable } from "@refinedev/antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

export const dynamic = 'force-dynamic';

type Country = {
  id: number;
  iso_a3: string;
  name_fr: string;
  name_en: string;
  region: string | null;
  tooltip_info?: string;
};

export default function CountriesList() {
  const { tableProps } = useTable<Country>({
    resource: "countries",
    sorters: { initial: [{ field: "name_fr", order: "asc" }] },
    pagination: { pageSize: 20 },
  });

  return (
    <List headerButtons={<CreateButton />}>
      <Table rowKey="id" {...tableProps}>
        <Table.Column dataIndex="iso_a3" title="ISO A3" width={80} />
        <Table.Column dataIndex="name_fr" title="Nom (FR)" width={150} />
        <Table.Column dataIndex="name_en" title="Name (EN)" width={150} />
        <Table.Column dataIndex="region" title="Région" width={100} />
        
        <Table.Column<Country>
          dataIndex="tooltip_info"
          title="Tooltip Info"
          width={250}
          render={(text: string) => (
            <div style={{ maxWidth: 250 }}>
              {text ? (
                <Tooltip title={text}>
                  <span>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {text.length > 40 ? `${text.substring(0, 40)}...` : text}
                  </span>
                </Tooltip>
              ) : (
                <span style={{ color: '#999' }}>
                  <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                  À compléter
                </span>
              )}
            </div>
          )}
        />

        <Table.Column<Country>
          title="Actions"
          width={100}
          render={(_, r) => <EditButton size="small" recordItemId={r.id} />}
        />
      </Table>
    </List>
  );
}