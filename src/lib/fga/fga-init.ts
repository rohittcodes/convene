import { buildOpenFgaClient } from '@auth0/ai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { transformer } from '@openfga/syntax-transformer';

/**
 * Initializes the OpenFgaClient, writes an authorization model, and configures pre-defined tuples.
 *
 * This function performs the following steps:
 *    1. Creates an instance of OpenFgaClient with the necessary configuration.
 *    2. Reads the FGA schema from schema.fga file.
 *    3. Transforms the DSL to a model and writes it to FGA.
 */
async function main() {
  require('dotenv').config({ path: ['.env.local', '.env'] });

  const fgaClient = buildOpenFgaClient();

  // Read the FGA schema from the file
  const schemaPath = join(process.cwd(), 'src', 'lib', 'fga', 'schema.fga');
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  // Transform the DSL to a model
  const model = transformer.transformDSLToJSONObject(schemaContent);

  // Write the authorization model
  const result = await fgaClient.writeAuthorizationModel(model);

  console.log('NEW MODEL ID: ', result.authorization_model_id);
  console.log('FGA authorization model published successfully!');
  console.log('You can now set FGA_MODEL_ID environment variable to:', result.authorization_model_id);
}

main().catch(console.error);
