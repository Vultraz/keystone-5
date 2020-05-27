import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/react-hooks';

import { Container, Grid, Cell } from '@arch-ui/layout';
import { PageTitle } from '@arch-ui/typography';

import { ListProvider } from '../../providers/List';
import DocTitle from '../../components/DocTitle';
import PageError from '../../components/PageError';
import { Box, HeaderInset } from './components';

import { useAdminMeta } from '../../providers/AdminMeta';
import { useListMeta } from '../../providers/ListMeta';

import useResizeObserver from 'use-resize-observer';
import throttle from 'lodash.throttle';
import gql from 'graphql-tag';

const getCountQuery = lists => {
  if (!lists) return null;

  return gql`
    query getAllListCounts {
      ${lists.map(({ gqlNames }) => `${gqlNames.listQueryMetaName} { count }`).join('\n')}
    }
  `;
};

const Homepage = () => {
  const { getListByKey, listKeys } = useListMeta();
  const { adminPath } = useAdminMeta();

  const lists = listKeys.map(key => getListByKey(key));

  const { data, error } = useQuery(getCountQuery(lists), {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [cellWidth, setCellWidth] = useState(3);

  // Restrict size updates to ~15 FPS (60ms)
  const throttledSetCellWidth = useMemo(() => throttle(setCellWidth, 60), []);

  const { ref: measureElement } = useResizeObserver({
    onResize: ({ width }) => {
      // requestAnimationFrame works around a weird 'ResizeObserver loop limit exceeded' error.
      // See https://stackoverflow.com/a/50387233 and https://github.com/WICG/ResizeObserver/issues/38.
      window.requestAnimationFrame(() =>
        throttledSetCellWidth(width < 480 ? 12 : width < 768 ? 6 : width < 1024 ? 4 : 3)
      );
    },
  });

  if (error) {
    return (
      <PageError>
        <p>{error.message}</p>
      </PageError>
    );
  }

  // NOTE: `loading` is intentionally omitted here
  // the display of a loading indicator for counts is deferred to the
  // list component so we don't block rendering the lists immediately
  // to the user.
  return (
    <main>
      <DocTitle title="Home" />
      <Container>
        <HeaderInset>
          <PageTitle>Dashboard</PageTitle>
        </HeaderInset>
        <Grid ref={measureElement} gap={16}>
          {lists.map(list => {
            const { key, path } = list;
            const meta = data && data[list.gqlNames.listQueryMetaName];
            return (
              <ListProvider list={list} key={key}>
                <Cell width={cellWidth}>
                  <Box to={`${adminPath}/${path}`} meta={meta} />
                </Cell>
              </ListProvider>
            );
          })}
        </Grid>
      </Container>
    </main>
  );
};

export default Homepage;
