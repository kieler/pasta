import { LangiumServices } from "langium/lsp";
import { URI } from "vscode-uri";
import { Model, Rule } from "../../generated/ast.js";

type RuleType = Rule["type"];

// rule types, checked against the generated AST
const allowedRuleTypes = [
    "not-provided",
    "provided",
    "too-late",
    "too-early",
    "wrong-time",
    "applied-too-long",
    "stopped-too-soon",
] as const satisfies readonly RuleType[];

function isRuleType(value: string): value is RuleType {
    return (allowedRuleTypes as readonly string[]).includes(value);
}

/**
 * Input needed to generate a Context-Table rule (or a single context line).
 */
export interface AddRuleInput {
    type: string;
    controlAction: { controller: string; action: string };
    varMap: Record<string, string>;

    // for later changes
    ruleName?: string; 
    contextName?: string; 
    hazardListStr?: string;
}

export interface GeneratedRuleTexts {
    ruleText: string; // Full rule block to insert as a new rule.
    contextText: string; // Single context line to append inside an existing matching rule. 
}

/**
 * Generates the textual representation for a Context-Table rule according to the current grammar.
 * Offers a validation function that parses the generated text and throws on syntax errors.
 */
export class ContextTableRuleTextBuilder {
    constructor(private readonly services: LangiumServices) {}

    /**
     * Generate ruleText + contextText. Uses model to auto-pick free RL/UCA IDs.
     * @param input The details needed to fill the rule template
     * @returns The generated rule text and context text
     */
    generate(input: AddRuleInput): GeneratedRuleTexts {
        //TODO: doesn't check if ID is valid
        const hazardListStr = input.hazardListStr ?? "[] // add fitting hazard"; 
        const ruleName = input.ruleName ?? "RL01";
        const ctxName = input.contextName ?? "UCA01";

        const assignedPairs = Object.entries(input.varMap).map(([k, v]) => `${k}=${v}`);
        const assignedStr = assignedPairs.join(",");

        const selectedControlAction = `${input.controlAction.controller}.${input.controlAction.action}`;

        // Full rule block
        const lines: string[] = [];
        lines.push(`${ruleName} {`);
        lines.push(`\tcontrolAction: ${selectedControlAction}`);
        lines.push(`\ttype: ${input.type} // choose correct type`);
        lines.push(`\tcontexts: {`);
        lines.push(`\t\t${ctxName} [${assignedStr}] ${hazardListStr}`);
        lines.push(`\t}`);
        lines.push(`}`);

        const ruleText = lines.join("\r\n") + "\r\n";

        // Context-only line (prepend newline so it can be inserted at end of contexts list)
        const contextText = "\r\n" + `\t\t${ctxName} [${assignedStr}] ${hazardListStr}`;

        return { ruleText, contextText };
    }

    /**
     * Validate the generated text. This will give an error when the rule syntax changes.
     * @param ruleSnippet Either the full rule text or just the context line.
     * @throws Error if the text does not parse as valid STPA Context-Table grammar.
     * @returns Promise that resolves if the text is valid, or rejects with an error if not.
     */
    async assertParsesAsStpaSnippet(ruleSnippet: string): Promise<void> {
        // Extra validation: if the snippet contains multiple type, verify all options are valid
        this.assertAllPlaceholderTypesAreValid(ruleSnippet);

        // Normalize placeholders that are intentionally not valid grammar (ONLY for validation).
        const normalizedSnippet = ruleSnippet
        .replace(/\[\]\s*(\/\/[^\r\n]*)?/g, "[H1]$1") // empty hazard list
        .replace(
            /^(\s*type:\s*)([^\r\n]*\/[^\r\n]*)(\s*(\/\/.*)?)$/m,
            (_full, prefix, _badValue, suffix) => `${prefix}wrong-time${suffix ?? ""}`
        ); // placeholder type with multiple options

        const isFullRule = /\bcontrolAction\s*:/.test(normalizedSnippet);

        // Wrap so the grammar can parse it.
        const wrapped = isFullRule
            ? `Context-Table\r\n${normalizedSnippet}\r\n`
            : [
                "Context-Table",
                "RL_TMP {",
                "\tcontrolAction: X.Y",
                "\ttype: provided",
                "\tcontexts: {",
                normalizedSnippet.replace(/^\r?\n/, ""),
                "\t}",
                "}",
                "",
            ].join("\r\n");

        const docFactory = this.services.shared.workspace.LangiumDocumentFactory;
        const builder = this.services.shared.workspace.DocumentBuilder;

        const uri = URI.parse("file:///__pasta_generated_rule_check.stpa");
        const doc = docFactory.fromString<Model>(wrapped, uri);

        await builder.build([doc], { validation: false });

        const lexerErrors = doc.parseResult.lexerErrors ?? [];
        const parserErrors = doc.parseResult.parserErrors ?? [];
        if (lexerErrors.length > 0 || parserErrors.length > 0) {
            const msg = [
                ...lexerErrors.map(e => `Lexer: ${e.message}`),
                ...parserErrors.map(e => `Parser: ${e.message}`),
            ].join("\n");

            throw new Error(
                `Generated Context-Table text does not parse anymore:\n${msg}\n---\nOriginal snippet:\n${ruleSnippet}`
            );
        }
    }

    /**
     * If the snippet uses a placeholder for the rule type (e.g., "type: too-early/too-late"), this function will verify that EACH option is a valid grammar type.
     * @param ruleSnippet The generated rule text or context line that may contain a placeholder type.
     * @throws Error if any of the options in the placeholder is not a valid rule type.
     */
    private assertAllPlaceholderTypesAreValid(ruleSnippet: string): void {
        const match = ruleSnippet.match(/^\s*type:\s*([^\r\n]*?)(\s*\/\/.*)?$/m);
        if (!match) {
            return;
        }

        const rawValue = match[1].trim();
        if (rawValue.length === 0) {
            return;
        }

        // allow placeholder with "/"
        const options = rawValue.split("/").map(s => s.trim()).filter(Boolean);

        const invalid = options.filter(o => !isRuleType(o));
        if (invalid.length > 0) {
            throw new Error(
                `Invalid rule type option(s): ${invalid.join(", ")}. Allowed types: ${allowedRuleTypes.join(", ")}`
            );
        }
    }
}