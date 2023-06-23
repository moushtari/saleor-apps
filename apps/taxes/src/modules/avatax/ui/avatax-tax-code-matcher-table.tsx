import { useDashboardNotification } from "@saleor/apps-shared";
import React from "react";
import { trpcClient } from "../../trpc/trpc-client";
import { Table } from "../../ui/table";
import { Select } from "../../ui/_select";
import { Box, Text } from "@saleor/macaw-ui/next";
import { AppCard } from "../../ui/app-card";

const SelectTaxCode = ({ taxClassId }: { taxClassId: string }) => {
  const [value, setValue] = React.useState("");
  const { notifySuccess, notifyError } = useDashboardNotification();

  const { data: avataxMatches, isLoading: isMatchesLoading } =
    trpcClient.avataxMatches.getAll.useQuery();

  React.useEffect(() => {
    if (avataxMatches) {
      const match = avataxMatches?.find((item) => item.data.saleorTaxClassId === taxClassId);

      if (match) {
        setValue(match.data.avataxTaxCode);
      }
    }
  }, [avataxMatches, taxClassId]);

  const { mutate: updateMutation } = trpcClient.avataxMatches.upsert.useMutation({
    onSuccess() {
      notifySuccess("Success", "Updated Avatax tax code matches");
    },
    onError(error) {
      notifyError("Error", error.message);
    },
  });

  const { data: providers } = trpcClient.providersConfiguration.getAll.useQuery();

  /*
   * Tax Code Matcher is only available when there is at least one connection.
   * The reason for it is that we need any working credentials to fetch the provider tax codes.
   */
  const firstConnectionId = providers?.[0].id;

  const { data: taxCodes = [], isLoading: isCodesLoading } =
    trpcClient.avataxTaxCodes.getAllForId.useQuery(
      {
        connectionId: firstConnectionId!,
      },
      {
        enabled: firstConnectionId !== undefined,
      }
    );

  const changeValue = (avataxTaxCode: string) => {
    setValue(avataxTaxCode);
    updateMutation({
      saleorTaxClassId: taxClassId,
      avataxTaxCode,
    });
  };

  const isLoading = isMatchesLoading || isCodesLoading;

  return (
    <Select
      value={value ?? ""}
      disabled={isLoading}
      onChange={(value) => changeValue(String(value))}
      options={[
        ...(isLoading
          ? [{ value: "", label: "Loading..." }]
          : [{ value: "", label: "Not assigned" }]),
        ...taxCodes.map((item) => ({
          value: item.code,
          label: `${item.code} | ${item.description}`,
        })),
      ]}
    />
  );
};

export const AvataxTaxCodeMatcherTable = () => {
  const { data: taxClasses = [], isLoading } = trpcClient.taxClasses.getAll.useQuery();

  if (isLoading) {
    return (
      <Box>
        <Text color="textNeutralSubdued">Loading...</Text>
      </Box>
    );
  }

  return (
    <AppCard>
      <Table.Container>
        <Table.THead>
          <Table.TR>
            <Table.TH>Saleor tax class</Table.TH>
            <Table.TH>Avatax tax code</Table.TH>
          </Table.TR>
        </Table.THead>
        <Table.TBody>
          {taxClasses.map((taxClass) => {
            return (
              <Table.TR key={taxClass.id}>
                <Table.TD>{taxClass.name}</Table.TD>
                <Table.TD>
                  <SelectTaxCode taxClassId={taxClass.id} />
                </Table.TD>
              </Table.TR>
            );
          })}
        </Table.TBody>
      </Table.Container>
    </AppCard>
  );
};
