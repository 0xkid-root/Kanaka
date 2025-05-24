import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AppProviders } from '../providers/AppProviders';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Kanaka Protocol</title>
        <meta name="description" content="A decentralized, non-custodial, real-yield optimizer on Starknet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <AppProviders>
        <Component {...pageProps} />
      </AppProviders>
    </>
  );
}

export default MyApp;