# PASTA

Pragmatic-Automated System Theoretic Process Analysis (PASTA) is a [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=kieler.pasta) that provides a textual DSL for System-Theoretic Process Analysis (STPA) and automatically generates diagrams.

Further features are:
* a textual DSL for Fault Tree Analysis (FTA) with interactive cut set visualization;
* automatic generation of fault trees based on STPA;
* automatic generation of LTL formulas based on the Unsafe Control Actions (UCAs) of STPA;
* automatic generation of a safe-by-construction behavior model based on the automatically generated LTL formulas.

A more detailed explanation of all features can be found [here](https://github.com/kieler/pasta/blob/master/extension/README.md).

Examples can be found in [pasta-examples](https://github.com/kieler/pasta-examples).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kieler/pasta-examples)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/new#https://github.com/kieler/pasta-examples/tree/main)

## Developing the VS Code extension

The following steps are required to start developing:

1. Install [Node.js](https://nodejs.org) and [yarn](https://classic.yarnpkg.com/).
2. Run ```yarn install``` in the root folder to install all dependencies.
3. Run ```yarn build``` in the root folder to compile.
4. Open the respository in VS Code.
5. Run the "Run PASTA Extension" launch configuration.
6. A VS Code instance with the STPA-DSL extension should be started.
