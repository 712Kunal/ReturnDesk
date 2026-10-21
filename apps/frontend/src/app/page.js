"use client";
import { useEffect, useState } from 'react';
import { listRequests } from '@/lib/api';

export default function Home() {
  const [state, setState] = useState('loading...');

  useEffect(() => {
    listRequests({ pageSize: 2 })
      .then((res) => setState(`Connected. ${res.meta.total} requests, first: ${res.data[0]?.reference}`))
      .catch((err) => setState(`Error: ${err.code} - ${err.message}`));
  }, []);

  return <main className="p-8 text-lg">{state}</main>;
}