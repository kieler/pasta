import { Disposable, TextEditorDecorationType, Range, TextEditor, window, workspace } from "vscode";
import { INLINE_MARKER_DEFINITIONS, type MarkerConfig } from "./utils-classes";

function escapeForRegexLiteral(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class InlineMarkdownDecorator {
    private readonly markerConfigs: readonly MarkerConfig<TextEditorDecorationType>[];
    private disposables: Disposable[] = [];
    private markerVisible: boolean = false;
    private markerDecoration: TextEditorDecorationType;
    private escapeDecoration: TextEditorDecorationType;
    private boldDecoration: TextEditorDecorationType;
    private italicDecoration: TextEditorDecorationType;
    private underlineDecoration: TextEditorDecorationType;
    private strikethroughDecoration: TextEditorDecorationType;
    

    constructor() {
        // Style to hide markers
        this.markerDecoration = window.createTextEditorDecorationType({
            textDecoration: 'none; font-size: 0;',
            color: 'transparent'
        });

        // Style to hide escape backslashes
        this.escapeDecoration = window.createTextEditorDecorationType({
            color: 'transparent',
            textDecoration: 'none; font-size: 0;',
        });

        this.boldDecoration = window.createTextEditorDecorationType({
            fontWeight: 'bold',
            textDecoration: 'none; text-shadow: 0 0 0.75px currentColor, 0 0 0.75px currentColor;'
        });

        this.italicDecoration = window.createTextEditorDecorationType({
            fontStyle: 'italic'
        });

        this.underlineDecoration = window.createTextEditorDecorationType({
            textDecoration: 'underline'
        });

        this.strikethroughDecoration = window.createTextEditorDecorationType({
            textDecoration: 'line-through'
        });

        // shared marker list; add here decorations for markers
        this.markerConfigs = INLINE_MARKER_DEFINITIONS.map(({ marker }) => {
            if (marker === "_") {
                return { marker, decoration: this.underlineDecoration };
            }
            else if (marker === "~") {
                return { marker, decoration: this.strikethroughDecoration };
            } else {
                return { marker, decoration: this.italicDecoration, doubleDecoration: this.boldDecoration};
            }
        });


        // Update decorations when document changes
        this.disposables.push(
            window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Update decorations when cursor position changes
        this.disposables.push(
            window.onDidChangeTextEditorSelection(event => {
                this.updateDecorations(event.textEditor);
            })
        );

        // Update decorations when document content changes
        this.disposables.push(
            workspace.onDidChangeTextDocument(event => {
                const editor = window.activeTextEditor;
                if (editor && event.document === editor.document) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Initial decoration
        if (window.activeTextEditor) {
            this.updateDecorations(window.activeTextEditor);
        }
    }

    /**
     * Updates the visibility of marker decorations
     * @param markersVisible boolean that shows whether markers should be visible
     */
    public updateMarkerVisibility(markersVisible: boolean): void {
        this.markerVisible = markersVisible;
        const editor = window.activeTextEditor;
        if (editor) {
             this.updateDecorations(editor); // pass as param
        }
    }

     /**
      * Clears all decorations managed by this decorator from the provided editor.
      * @param editor The text editor to clear decorations from.
      */
     private clearDecorations(editor: TextEditor): void {
         for (const cfg of this.markerConfigs) {
             editor.setDecorations(cfg.decoration, []);
             if (cfg.doubleDecoration) {
                 editor.setDecorations(cfg.doubleDecoration, []);
             }
         }
         editor.setDecorations(this.markerDecoration, []);
         editor.setDecorations(this.escapeDecoration, []);
     }

    /**
     * Utility to push a range into the map of decoration ranges, creating the array if it doesn't exist yet.
     * @param map the map of decoration types to their ranges
     * @param decoration the decoration type for which to add the range
     * @param range the range to add for the decoration type
     */
    private pushRange(
        map: Map<TextEditorDecorationType, Range[]>,
        decoration: TextEditorDecorationType,
        range: Range
    ): void {
        const arr = map.get(decoration);
        if (arr) {
            arr.push(range);
        } else {
            map.set(decoration, [range]);
        }
    }

    /**
     * Collects all standalone escape sequences in a string (e.g. \*, \_, \~, \\) and adds their ranges to allEscapeRanges.
     * @param editor The text editor containing the string.
     * @param stringContent The content of the string 
     * @param stringStartOffset The offset of the start of the string in the document
     * @param allEscapeRanges An array of all the escape ranges found so far, with their start and end offsets in the document.
     * @param markerConfigs The marker configurations to determine which escape sequences to look for. If not provided, uses the default markerConfigs of the class.
     */
    private collectStandaloneEscapesInString(
        editor: TextEditor,
        stringContent: string,
        stringStartOffset: number,
        allEscapeRanges: { range: Range; fullStart: number; fullEnd: number }[],
        markerConfigs: readonly MarkerConfig<TextEditorDecorationType>[] = this.markerConfigs
    ): void {
        // Use a Set to avoid duplicates 
        const markers = new Set<string>(markerConfigs.map(c => c.marker));
        markers.add("\\");

        // Build a regex that matches backslash + any configured marker.
        const alternation = Array.from(markers).map(escapeForRegexLiteral).join("|");
        if (!alternation) {
            return;
        }
        const re = new RegExp(`\\\\(?:${alternation})`, "g");

        let m: RegExpExecArray | null;
        while ((m = re.exec(stringContent)) !== null) {
            const backslashOffset = stringStartOffset + m.index;

            const bsStart = editor.document.positionAt(backslashOffset);
            const bsEnd = editor.document.positionAt(backslashOffset + 1); // backslash only

            allEscapeRanges.push({
                range: new Range(bsStart, bsEnd),
                // cover the whole two-character escape sequence "\X"
                fullStart: backslashOffset,
                fullEnd: backslashOffset + 2,
            });
        }
    }

    /**
     * Adds decoration ranges based on the provided configuration.
     * @param editor The text editor containing the string.
     * @param stringContent The content of the string 
     * @param stringStartOffset The offset of the start of the string in the document
     * @param config The marker configuration.
     * @param allMarkerRanges An array of all the marker ranges found so far.
     * @param decorationRangesByDecoration A map of decoration types to their ranges.
     */
    private addDecorationsFromConfig(
        editor: TextEditor,
        stringContent: string,
        stringStartOffset: number,
        config: MarkerConfig<TextEditorDecorationType>,
        allMarkerRanges: { range: Range; fullStart: number; fullEnd: number }[],
        decorationRangesByDecoration: Map<TextEditorDecorationType, Range[]>
    ): void {
        const escapedMarker = escapeForRegexLiteral(config.marker);
        const regex = new RegExp(`(?<!\\\\)(${escapedMarker}+)(.+?)(?<!\\\\)\\1(?!${escapedMarker})`, "g");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(stringContent)) !== null) {
            const markerCount = match[1].length;
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            const fullStartOffset = stringStartOffset + matchStart;
            const fullEndOffset = stringStartOffset + matchEnd;

            const fullStart = editor.document.positionAt(fullStartOffset);
            const fullEnd = editor.document.positionAt(fullEndOffset);
            const contentStart = editor.document.positionAt(fullStartOffset + markerCount);
            const contentEnd = editor.document.positionAt(fullEndOffset - markerCount);

            const contentRange = new Range(contentStart, contentEnd);

            // Decide which decoration(s) apply to content:
            if (config.doubleDecoration) {
                if (markerCount === 1) {
                    this.pushRange(decorationRangesByDecoration, config.decoration, contentRange);
                }
                else if (markerCount === 2) {
                    this.pushRange(decorationRangesByDecoration, config.doubleDecoration, contentRange);
                } else if (markerCount >= 3) {
                    this.pushRange(decorationRangesByDecoration, config.decoration, contentRange);
                    this.pushRange(decorationRangesByDecoration, config.doubleDecoration, contentRange);
                }
            } else {
                this.pushRange(decorationRangesByDecoration, config.decoration, contentRange);
            }

            // Marker ranges (for hiding)
            const startMarkerRange = new Range(fullStart, contentStart);
            const endMarkerRange = new Range(contentEnd, fullEnd);

            allMarkerRanges.push({ 
                range: startMarkerRange, 
                fullStart: fullStartOffset, 
                fullEnd: fullEndOffset 
            });
            allMarkerRanges.push({ 
                range: endMarkerRange, 
                fullStart: fullStartOffset, 
                fullEnd: fullEndOffset 
            });
        }
    }

    /**
     * Main function to update decorations in the editor. It finds all strings, applies decorations based on markers, and handles marker visibility based on cursor position.
     * @param editor The text editor to update decorations for.
     */
    private updateDecorations(editor: TextEditor): void {
         if (editor.document.languageId !== "stpa") {
             this.clearDecorations(editor);
             return;
         }
        const text = editor.document.getText();
        const cursorOffset = editor.document.offsetAt(editor.selection.active);

        const allMarkerRanges: { range: Range; fullStart: number; fullEnd: number }[] = [];
        const allEscapeRanges: { range: Range; fullStart: number; fullEnd: number }[] = [];

        // Stores content ranges per decoration type
        const decorationRangesByDecoration = new Map<TextEditorDecorationType, Range[]>();

        // Initialize all known decoration types so stale ranges are cleared,
        // even when a type has no matches in this update cycle.
        for (const cfg of this.markerConfigs) {
            if (!decorationRangesByDecoration.has(cfg.decoration)) {
                decorationRangesByDecoration.set(cfg.decoration, []);
            }
            if (cfg.doubleDecoration && !decorationRangesByDecoration.has(cfg.doubleDecoration)) {
                decorationRangesByDecoration.set(cfg.doubleDecoration, []);
            }
        }

        const stringRegex = /"([^"]*)"|'([^']*)'/g;
        let stringMatch: RegExpExecArray | null;

        while ((stringMatch = stringRegex.exec(text)) !== null) {
            const stringContent = (stringMatch[1] || stringMatch[2]) ?? "";
            const stringStartOffset = stringMatch.index + 1;

            for (const cfg of this.markerConfigs) {
                this.addDecorationsFromConfig(
                    editor,
                    stringContent,
                    stringStartOffset,
                    cfg,
                    allMarkerRanges,
                    decorationRangesByDecoration
                );
            }

            this.collectStandaloneEscapesInString(editor, stringContent, stringStartOffset, allEscapeRanges);
        }


        // Filter: show all markers if markerVisible
        // otherwise only hide markers where cursor is NOT within the formatted range
        const filteredMarkerRanges = 
            this.markerVisible ? []
                               : allMarkerRanges
                                    .filter(marker => !(cursorOffset >= marker.fullStart && cursorOffset <= marker.fullEnd))
                                    .map(marker => marker.range);

        // Filter: show all backslashes if markerVisible
        // otherwiseonly hide escape backslashes where cursor is NOT within the formatted range
        const filteredEscapeRanges = 
            this.markerVisible ? []
                               : allEscapeRanges
                                    .filter(escape => !(cursorOffset >= escape.fullStart && cursorOffset <= escape.fullEnd))
                                    .map(escape => escape.range);


        for (const [decoration, ranges] of decorationRangesByDecoration) {
        editor.setDecorations(decoration, ranges);
        }

        editor.setDecorations(this.markerDecoration, filteredMarkerRanges);
        editor.setDecorations(this.escapeDecoration, filteredEscapeRanges);
    }

    dispose(): void {
        // dispose event subscriptions
        this.disposables.forEach(d => d.dispose());

        // dispose marker content decorations from config
        const decorations = new Set<TextEditorDecorationType>();
        for (const cfg of this.markerConfigs) {
            decorations.add(cfg.decoration);
            if (cfg.doubleDecoration) {
                decorations.add(cfg.doubleDecoration);
            }
        }
        decorations.forEach(d => d.dispose());

        // dispose utility decorations
        this.markerDecoration.dispose();
        this.escapeDecoration.dispose();
    }
}