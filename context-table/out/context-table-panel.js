/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/ContextTablePanel.ts":
/*!**********************************!*\
  !*** ./src/ContextTablePanel.ts ***!
  \**********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\r\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\r\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\r\n    return new (P || (P = Promise))(function (resolve, reject) {\r\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\r\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\r\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\r\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\r\n    });\r\n};\r\nvar __generator = (this && this.__generator) || function (thisArg, body) {\r\n    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;\r\n    return g = { next: verb(0), \"throw\": verb(1), \"return\": verb(2) }, typeof Symbol === \"function\" && (g[Symbol.iterator] = function() { return this; }), g;\r\n    function verb(n) { return function (v) { return step([n, v]); }; }\r\n    function step(op) {\r\n        if (f) throw new TypeError(\"Generator is already executing.\");\r\n        while (_) try {\r\n            if (f = 1, y && (t = op[0] & 2 ? y[\"return\"] : op[0] ? y[\"throw\"] || ((t = y[\"return\"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;\r\n            if (y = 0, t) op = [op[0] & 2, t.value];\r\n            switch (op[0]) {\r\n                case 0: case 1: t = op; break;\r\n                case 4: _.label++; return { value: op[1], done: false };\r\n                case 5: _.label++; y = op[1]; op = [0]; continue;\r\n                case 7: op = _.ops.pop(); _.trys.pop(); continue;\r\n                default:\r\n                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }\r\n                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }\r\n                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }\r\n                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }\r\n                    if (t[2]) _.ops.pop();\r\n                    _.trys.pop(); continue;\r\n            }\r\n            op = body.call(thisArg, _);\r\n        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }\r\n        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };\r\n    }\r\n};\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nvar vscode = __webpack_require__(/*! vscode */ \"vscode\");\r\nvar ContextTablePanel = /** @class */ (function () {\r\n    function ContextTablePanel(panel, extensionUri) {\r\n        var _this = this;\r\n        this._disposables = [];\r\n        this._panel = panel;\r\n        this._extensionUri = extensionUri;\r\n        // Initialize the webview.\r\n        this._update();\r\n        // Listen for the panel being disposed.\r\n        this._panel.onDidDispose(function () { return _this.dispose(); }, null, this._disposables);\r\n    }\r\n    // Main call method.\r\n    ContextTablePanel.createOrShow = function (extensionUri) {\r\n        var column = vscode.window.activeTextEditor\r\n            ? vscode.window.activeTextEditor.viewColumn\r\n            : undefined;\r\n        // If we already have a panel, show it.\r\n        if (ContextTablePanel.currentPanel) {\r\n            ContextTablePanel.currentPanel._panel.reveal(column);\r\n            ContextTablePanel.currentPanel._update();\r\n            return;\r\n        }\r\n        // Otherwise, create a new panel.\r\n        var panel = vscode.window.createWebviewPanel(ContextTablePanel.viewType, \"Context Table\", vscode.ViewColumn.Two, {\r\n            // Enable javascript in the webview\r\n            enableScripts: true,\r\n            // And restrict the webview to only loading content from our extension's `css` directory.\r\n            localResourceRoots: [\r\n                vscode.Uri.joinPath(extensionUri, \"css\")\r\n            ],\r\n        });\r\n        ContextTablePanel.currentPanel = new ContextTablePanel(panel, extensionUri);\r\n    };\r\n    // Kills off the current panel.\r\n    ContextTablePanel.kill = function () {\r\n        var _a;\r\n        (_a = ContextTablePanel.currentPanel) === null || _a === void 0 ? void 0 : _a.dispose();\r\n        ContextTablePanel.currentPanel = undefined;\r\n    };\r\n    // Revives a defined panel.\r\n    ContextTablePanel.revive = function (panel, extensionUri) {\r\n        ContextTablePanel.currentPanel = new ContextTablePanel(panel, extensionUri);\r\n        // Exists so the _extensionUri variable is read at least once.\r\n        ContextTablePanel.currentPanel._extensionUri.path;\r\n    };\r\n    // Disposes of the panel and all its related data.\r\n    ContextTablePanel.prototype.dispose = function () {\r\n        ContextTablePanel.currentPanel = undefined;\r\n        // Dispose of no longer needed data.\r\n        this._panel.dispose();\r\n        while (this._disposables.length) {\r\n            var trash = this._disposables.pop();\r\n            if (trash) {\r\n                trash.dispose();\r\n            }\r\n        }\r\n    };\r\n    // Update function. Used for generating and maintaining the view's content.\r\n    ContextTablePanel.prototype._update = function () {\r\n        return __awaiter(this, void 0, void 0, function () {\r\n            var webview;\r\n            return __generator(this, function (_a) {\r\n                webview = this._panel.webview;\r\n                this._panel.webview.html = this._getHtmlForWebview(webview);\r\n                return [2 /*return*/];\r\n            });\r\n        });\r\n    };\r\n    ContextTablePanel.prototype._getHtmlForWebview = function (webview) {\r\n        // Get the style sheets to be used for the HTML data\r\n        /*const resetterUri = webview.asWebviewUri(vscode.Uri.joinPath(\r\n          this._extensionUri,\r\n          \"src\",\r\n          \"resetter.css\"\r\n        ));\r\n        const vscStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(\r\n          this._extensionUri,\r\n          \"src\",\r\n          \"vscode-style.css\"\r\n        ));*/\r\n        var tableStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, \"src\", \"table.css\"));\r\n        // HTML\r\n        return \"<!DOCTYPE html>\\n\\t\\t<html lang=\\\"en\\\">\\n\\t\\t\\t<head>\\n\\t\\t\\t\\t<meta charset=\\\"UTF-8\\\">\\n\\t\\t    <meta name=\\\"viewport\\\" content=\\\"width=device-width, initial-scale=1.0\\\">\\n        <link href=\\\"\" + tableStyleUri + \"\\\" rel=\\\"stylesheet\\\">\\n\\t\\t  </head>\\n      <body>\\n        <label for \\\"controlAction\\\">Control Action</label>\\n        <select name = \\\"controlAction\\\" id = \\\"controlAction\\\">\\n          <option value = \\\"manBrake\\\">Manual Braking</option>\\n          <option value = \\\"onBSCU\\\">Power On BSCU</option>\\n          <option value = \\\"offBSCU\\\">Power Off BSCU</option>\\n        </select>\\n        <label for \\\"type\\\">, Type</label>\\n        <select name = \\\"type\\\" id = \\\"type\\\">\\n          <option value = \\\"prov\\\">provided</option>\\n          <option value = \\\"noProv\\\">not provided</option>\\n        </select>\\n        <button type = \\\"button\\\" class = \\\"catButton\\\">Submit</button>\\n        <table>\\n          <tr>\\n            <th rowspan = \\\"2\\\">Control Action</th>\\n            <th colspan = \\\"2\\\">Context Variables</th>\\n            <th colspan = \\\"3\\\">Hazardous?</th>\\n          </tr>\\n          <tr>\\n            <th>Variable A</th>\\n            <th>Variable B</th>\\n            <th>Anytime</th>\\n            <th>Too Early</th>\\n            <th>Too Late</th>\\n          </tr>\\n          <tr>\\n            <td>CA</td>\\n            <td>0</td>\\n            <td>0</td>\\n            <td>No</td>\\n            <td>Yes</td>\\n            <td>No</td>\\n          </tr>\\n          <tr>\\n            <td>CA</td>\\n            <td>0</td>\\n            <td>1</td>\\n            <td colspan = \\\"3\\\">Yes</td>\\n          </tr>\\n        </table>\\n\\t\\t  </body>\\n\\t\\t</html>\";\r\n    };\r\n    ContextTablePanel.viewType = \"context-table\";\r\n    return ContextTablePanel;\r\n}());\r\nexports.ContextTablePanel = ContextTablePanel;\r\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LENBQUM7Z0JBRXBDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7Ozs7S0FDN0Q7SUFFTyw4Q0FBa0IsR0FBMUIsVUFBMkIsT0FBdUI7UUFDaEQsb0RBQW9EO1FBQ3BEOzs7Ozs7Ozs7YUFTSztRQUNMLElBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQzVELElBQUksQ0FBQyxhQUFhLEVBQ2xCLEtBQUssRUFDTCxXQUFXLENBQ1osQ0FBQyxDQUFDO1FBQ0gsT0FBTztRQUNQLE9BQU8sdU1BS1csYUFBYSx3N0NBNEN6QixDQUFDO0lBQ1QsQ0FBQztJQW5Kc0IsMEJBQVEsR0FBRyxlQUFlLENBQUM7SUFvSnBELHdCQUFDO0NBQUE7QUF2SlksOENBQWlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY29udGV4dC10YWJsZS13ZWJ2aWV3Ly4vc3JjL0NvbnRleHRUYWJsZVBhbmVsLnRzPzQyZmEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdnNjb2RlIGZyb20gXCJ2c2NvZGVcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb250ZXh0VGFibGVQYW5lbCB7XHJcbiAgLy8gVHJhY2sgdGhlIGN1cnJlbnQgcGFuZWwuIE9ubHkgYWxsb3cgYSBzaW5nbGUgcGFuZWwgdG8gZXhpc3QuIFxyXG4gIHB1YmxpYyBzdGF0aWMgY3VycmVudFBhbmVsOiBDb250ZXh0VGFibGVQYW5lbCB8IHVuZGVmaW5lZDtcclxuICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IHZpZXdUeXBlID0gXCJjb250ZXh0LXRhYmxlXCI7XHJcblxyXG4gIC8vIENvbnN0cnVjdG9yIHZhcmlhYmxlcy5cclxuICBwcml2YXRlIHJlYWRvbmx5IF9wYW5lbDogdnNjb2RlLldlYnZpZXdQYW5lbDtcclxuICBwcml2YXRlIHJlYWRvbmx5IF9leHRlbnNpb25Vcmk6IHZzY29kZS5Vcmk7XHJcbiAgcHJpdmF0ZSBfZGlzcG9zYWJsZXM6IHZzY29kZS5EaXNwb3NhYmxlW10gPSBbXTtcclxuXHJcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihwYW5lbDogdnNjb2RlLldlYnZpZXdQYW5lbCwgZXh0ZW5zaW9uVXJpOiB2c2NvZGUuVXJpKSB7XHJcbiAgICB0aGlzLl9wYW5lbCA9IHBhbmVsO1xyXG4gICAgdGhpcy5fZXh0ZW5zaW9uVXJpID0gZXh0ZW5zaW9uVXJpO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgdGhlIHdlYnZpZXcuXHJcbiAgICB0aGlzLl91cGRhdGUoKTtcclxuICAgIC8vIExpc3RlbiBmb3IgdGhlIHBhbmVsIGJlaW5nIGRpc3Bvc2VkLlxyXG4gICAgdGhpcy5fcGFuZWwub25EaWREaXNwb3NlKCgpID0+IHRoaXMuZGlzcG9zZSgpLCBudWxsLCB0aGlzLl9kaXNwb3NhYmxlcyk7XHJcbiAgfVxyXG5cclxuICAvLyBNYWluIGNhbGwgbWV0aG9kLlxyXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlT3JTaG93KGV4dGVuc2lvblVyaTogdnNjb2RlLlVyaSkge1xyXG4gICAgY29uc3QgY29sdW1uID0gdnNjb2RlLndpbmRvdy5hY3RpdmVUZXh0RWRpdG9yXHJcbiAgICAgID8gdnNjb2RlLndpbmRvdy5hY3RpdmVUZXh0RWRpdG9yLnZpZXdDb2x1bW5cclxuICAgICAgOiB1bmRlZmluZWQ7XHJcbiAgICAvLyBJZiB3ZSBhbHJlYWR5IGhhdmUgYSBwYW5lbCwgc2hvdyBpdC5cclxuICAgIGlmIChDb250ZXh0VGFibGVQYW5lbC5jdXJyZW50UGFuZWwpIHtcclxuICAgICAgQ29udGV4dFRhYmxlUGFuZWwuY3VycmVudFBhbmVsLl9wYW5lbC5yZXZlYWwoY29sdW1uKTtcclxuICAgICAgQ29udGV4dFRhYmxlUGFuZWwuY3VycmVudFBhbmVsLl91cGRhdGUoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gT3RoZXJ3aXNlLCBjcmVhdGUgYSBuZXcgcGFuZWwuXHJcbiAgICBjb25zdCBwYW5lbCA9IHZzY29kZS53aW5kb3cuY3JlYXRlV2Vidmlld1BhbmVsKFxyXG4gICAgICBDb250ZXh0VGFibGVQYW5lbC52aWV3VHlwZSxcclxuICAgICAgXCJDb250ZXh0IFRhYmxlXCIsXHJcbiAgICAgIHZzY29kZS5WaWV3Q29sdW1uLlR3byxcclxuICAgICAge1xyXG4gICAgICAgIC8vIEVuYWJsZSBqYXZhc2NyaXB0IGluIHRoZSB3ZWJ2aWV3XHJcbiAgICAgICAgZW5hYmxlU2NyaXB0czogdHJ1ZSxcclxuICAgICAgICAvLyBBbmQgcmVzdHJpY3QgdGhlIHdlYnZpZXcgdG8gb25seSBsb2FkaW5nIGNvbnRlbnQgZnJvbSBvdXIgZXh0ZW5zaW9uJ3MgYGNzc2AgZGlyZWN0b3J5LlxyXG4gICAgICAgIGxvY2FsUmVzb3VyY2VSb290czogW1xyXG4gICAgICAgICAgdnNjb2RlLlVyaS5qb2luUGF0aChleHRlbnNpb25VcmksIFwiY3NzXCIpXHJcbiAgICAgICAgXSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIENvbnRleHRUYWJsZVBhbmVsLmN1cnJlbnRQYW5lbCA9IG5ldyBDb250ZXh0VGFibGVQYW5lbChwYW5lbCwgZXh0ZW5zaW9uVXJpKTtcclxuICB9XHJcblxyXG4gIC8vIEtpbGxzIG9mZiB0aGUgY3VycmVudCBwYW5lbC5cclxuICBwdWJsaWMgc3RhdGljIGtpbGwoKSB7XHJcbiAgICBDb250ZXh0VGFibGVQYW5lbC5jdXJyZW50UGFuZWw/LmRpc3Bvc2UoKTtcclxuICAgIENvbnRleHRUYWJsZVBhbmVsLmN1cnJlbnRQYW5lbCA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIC8vIFJldml2ZXMgYSBkZWZpbmVkIHBhbmVsLlxyXG4gIHB1YmxpYyBzdGF0aWMgcmV2aXZlKHBhbmVsOiB2c2NvZGUuV2Vidmlld1BhbmVsLCBleHRlbnNpb25Vcmk6IHZzY29kZS5VcmkpIHtcclxuICAgIENvbnRleHRUYWJsZVBhbmVsLmN1cnJlbnRQYW5lbCA9IG5ldyBDb250ZXh0VGFibGVQYW5lbChwYW5lbCwgZXh0ZW5zaW9uVXJpKTtcclxuICAgIC8vIEV4aXN0cyBzbyB0aGUgX2V4dGVuc2lvblVyaSB2YXJpYWJsZSBpcyByZWFkIGF0IGxlYXN0IG9uY2UuXHJcbiAgICBDb250ZXh0VGFibGVQYW5lbC5jdXJyZW50UGFuZWwuX2V4dGVuc2lvblVyaS5wYXRoO1xyXG4gIH1cclxuXHJcbiAgLy8gRGlzcG9zZXMgb2YgdGhlIHBhbmVsIGFuZCBhbGwgaXRzIHJlbGF0ZWQgZGF0YS5cclxuICBwdWJsaWMgZGlzcG9zZSgpIHtcclxuICAgIENvbnRleHRUYWJsZVBhbmVsLmN1cnJlbnRQYW5lbCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAvLyBEaXNwb3NlIG9mIG5vIGxvbmdlciBuZWVkZWQgZGF0YS5cclxuICAgIHRoaXMuX3BhbmVsLmRpc3Bvc2UoKTtcclxuICAgIHdoaWxlICh0aGlzLl9kaXNwb3NhYmxlcy5sZW5ndGgpIHtcclxuICAgICAgY29uc3QgdHJhc2ggPSB0aGlzLl9kaXNwb3NhYmxlcy5wb3AoKTtcclxuICAgICAgaWYgKHRyYXNoKSB7XHJcbiAgICAgICAgdHJhc2guZGlzcG9zZSgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgZnVuY3Rpb24uIFVzZWQgZm9yIGdlbmVyYXRpbmcgYW5kIG1haW50YWluaW5nIHRoZSB2aWV3J3MgY29udGVudC5cclxuICBwcml2YXRlIGFzeW5jIF91cGRhdGUoKSB7XHJcbiAgICBjb25zdCB3ZWJ2aWV3ID0gdGhpcy5fcGFuZWwud2VidmlldztcclxuXHJcbiAgICB0aGlzLl9wYW5lbC53ZWJ2aWV3Lmh0bWwgPSB0aGlzLl9nZXRIdG1sRm9yV2Vidmlldyh3ZWJ2aWV3KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2dldEh0bWxGb3JXZWJ2aWV3KHdlYnZpZXc6IHZzY29kZS5XZWJ2aWV3KSB7XHJcbiAgICAvLyBHZXQgdGhlIHN0eWxlIHNoZWV0cyB0byBiZSB1c2VkIGZvciB0aGUgSFRNTCBkYXRhXHJcbiAgICAvKmNvbnN0IHJlc2V0dGVyVXJpID0gd2Vidmlldy5hc1dlYnZpZXdVcmkodnNjb2RlLlVyaS5qb2luUGF0aChcclxuICAgICAgdGhpcy5fZXh0ZW5zaW9uVXJpLFxyXG4gICAgICBcInNyY1wiLFxyXG4gICAgICBcInJlc2V0dGVyLmNzc1wiXHJcbiAgICApKTtcclxuICAgIGNvbnN0IHZzY1N0eWxlVXJpID0gd2Vidmlldy5hc1dlYnZpZXdVcmkodnNjb2RlLlVyaS5qb2luUGF0aChcclxuICAgICAgdGhpcy5fZXh0ZW5zaW9uVXJpLFxyXG4gICAgICBcInNyY1wiLFxyXG4gICAgICBcInZzY29kZS1zdHlsZS5jc3NcIlxyXG4gICAgKSk7Ki9cclxuICAgIGNvbnN0IHRhYmxlU3R5bGVVcmkgPSB3ZWJ2aWV3LmFzV2Vidmlld1VyaSh2c2NvZGUuVXJpLmpvaW5QYXRoKFxyXG4gICAgICB0aGlzLl9leHRlbnNpb25VcmksXHJcbiAgICAgIFwic3JjXCIsXHJcbiAgICAgIFwidGFibGUuY3NzXCJcclxuICAgICkpO1xyXG4gICAgLy8gSFRNTFxyXG4gICAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cclxuXHRcdDxodG1sIGxhbmc9XCJlblwiPlxyXG5cdFx0XHQ8aGVhZD5cclxuXHRcdFx0XHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cclxuXHRcdCAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMFwiPlxyXG4gICAgICAgIDxsaW5rIGhyZWY9XCIke3RhYmxlU3R5bGVVcml9XCIgcmVsPVwic3R5bGVzaGVldFwiPlxyXG5cdFx0ICA8L2hlYWQ+XHJcbiAgICAgIDxib2R5PlxyXG4gICAgICAgIDxsYWJlbCBmb3IgXCJjb250cm9sQWN0aW9uXCI+Q29udHJvbCBBY3Rpb248L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgbmFtZSA9IFwiY29udHJvbEFjdGlvblwiIGlkID0gXCJjb250cm9sQWN0aW9uXCI+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlID0gXCJtYW5CcmFrZVwiPk1hbnVhbCBCcmFraW5nPC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlID0gXCJvbkJTQ1VcIj5Qb3dlciBPbiBCU0NVPC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlID0gXCJvZmZCU0NVXCI+UG93ZXIgT2ZmIEJTQ1U8L29wdGlvbj5cclxuICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgICA8bGFiZWwgZm9yIFwidHlwZVwiPiwgVHlwZTwvbGFiZWw+XHJcbiAgICAgICAgPHNlbGVjdCBuYW1lID0gXCJ0eXBlXCIgaWQgPSBcInR5cGVcIj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWUgPSBcInByb3ZcIj5wcm92aWRlZDwvb3B0aW9uPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZSA9IFwibm9Qcm92XCI+bm90IHByb3ZpZGVkPC9vcHRpb24+XHJcbiAgICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgICAgPGJ1dHRvbiB0eXBlID0gXCJidXR0b25cIiBjbGFzcyA9IFwiY2F0QnV0dG9uXCI+U3VibWl0PC9idXR0b24+XHJcbiAgICAgICAgPHRhYmxlPlxyXG4gICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICA8dGggcm93c3BhbiA9IFwiMlwiPkNvbnRyb2wgQWN0aW9uPC90aD5cclxuICAgICAgICAgICAgPHRoIGNvbHNwYW4gPSBcIjJcIj5Db250ZXh0IFZhcmlhYmxlczwvdGg+XHJcbiAgICAgICAgICAgIDx0aCBjb2xzcGFuID0gXCIzXCI+SGF6YXJkb3VzPzwvdGg+XHJcbiAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICA8dGg+VmFyaWFibGUgQTwvdGg+XHJcbiAgICAgICAgICAgIDx0aD5WYXJpYWJsZSBCPC90aD5cclxuICAgICAgICAgICAgPHRoPkFueXRpbWU8L3RoPlxyXG4gICAgICAgICAgICA8dGg+VG9vIEVhcmx5PC90aD5cclxuICAgICAgICAgICAgPHRoPlRvbyBMYXRlPC90aD5cclxuICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgIDx0ZD5DQTwvdGQ+XHJcbiAgICAgICAgICAgIDx0ZD4wPC90ZD5cclxuICAgICAgICAgICAgPHRkPjA8L3RkPlxyXG4gICAgICAgICAgICA8dGQ+Tm88L3RkPlxyXG4gICAgICAgICAgICA8dGQ+WWVzPC90ZD5cclxuICAgICAgICAgICAgPHRkPk5vPC90ZD5cclxuICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgIDx0ZD5DQTwvdGQ+XHJcbiAgICAgICAgICAgIDx0ZD4wPC90ZD5cclxuICAgICAgICAgICAgPHRkPjE8L3RkPlxyXG4gICAgICAgICAgICA8dGQgY29sc3BhbiA9IFwiM1wiPlllczwvdGQ+XHJcbiAgICAgICAgICA8L3RyPlxyXG4gICAgICAgIDwvdGFibGU+XHJcblx0XHQgIDwvYm9keT5cclxuXHRcdDwvaHRtbD5gO1xyXG4gIH1cclxufSJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/ContextTablePanel.ts\n");

/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/ContextTablePanel.ts");
/******/ 	
/******/ })()
;