import { startLanguageServer } from 'langium';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { createStpaServices } from './stpa-module';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the language services
const services = createStpaServices({ connection });

// Start the language server with the language-specific services
startLanguageServer(services);
