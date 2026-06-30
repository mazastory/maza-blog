import { getSiteConfig } from './src/lib/api.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const config = await getSiteConfig('nextinsightlab.com');
  console.log("Config:", config);
}
run();
