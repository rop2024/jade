# Jade Application Design Guide

Jade is a local-first AI desktop assistant for conversations, local models, document
processing, retrieval from an Obsidian vault, and reusable prompt modes. Its interface
should feel like a precise operator console: dense enough for technical work, calm
enough for long conversations, and explicit about system state.

This guide adapts the reusable cyberpunk system in
[`asset-cyberpunk-design-guide`](https://github.com/rop2024/asset-cyberpunk-design-guide)
to the actual Jade application. The canonical implementation currently lives in
[`src/index.css`](src/index.css) and [`tailwind.config.js`](tailwind.config.js).

## 1. Design intent

### Product character

- **Local and private:** make vault, model, indexing, and lock state visible.
- **Technical but readable:** use monospace for metadata and content that behaves like
  data; use the condensed display face for headings and actions.
- **Fast and stateful:** streaming, indexing, batch processing, and cancellation must
  have visible states.
- **Focused:** use one semantic neon accent at a time; avoid decorative glow that
  competes with the current task.
- **Recoverable:** destructive actions require confirmation; errors remain visible
  until the user can understand or dismiss them.

### Visual vocabulary

The interface combines:

1. an almost-black canvas;
2. stepped blue-black surfaces;
3. thin technical borders;
4. condensed uppercase labels;
5. monospace data and prompts;
6. restrained neon accents;
7. asymmetric or squared-off panel details, such as a bottom-right radius.

## 2. Tokens

Use the existing Tailwind names instead of introducing one-off colors.

### Color

| Token | Hex | Meaning and use |
|---|---|---|
| `bg` | `#080A0F` | application canvas, editor background |
| `surface-1` | `#0E1119` | navigation, footer/input bands |
| `surface-2` | `#141925` | cards, dialogs, primary panels |
| `surface-3` | `#1B2230` | inputs, selected rows, secondary controls |
| `line` | `#293244` | dividers, borders, inactive structure |
| `text` | `#F2F5F7` | primary content |
| `muted` | `#8D98A8` | secondary content and labels |
| `dim` | `#566173` | hints, timestamps, disabled context |
| `cyan` | `#00E5FF` | links, information, active system state |
| `yellow` | `#FCEE09` | primary action, current selection, progress |
| `green` | `#5DFF6A` | complete, healthy, positive feedback |
| `magenta` | `#C44DFF` | system/model content and Word attachments |
| `pink` | `#FF3B7A` | error, destructive action, warning |
| `orange` | `#FF9F43` | secondary data or future warning states |

Semantic rules:

- Cyan means “available, informational, or active.”
- Yellow means “do this” or “this is selected/in progress.”
- Green means “completed or accepted.”
- Pink means “danger, failure, cancellation, or deletion.”
- Magenta identifies system/model-specific content.
- Never use a neon color only for decoration.
- Pair every color state with text, iconography, or position; color alone is not
  sufficient.

### Typography

| Role | Family | Typical treatment |
|---|---|---|
| Display | `Rajdhani`, `Bahnschrift`, `Arial Narrow` | page titles, panel titles, product name |
| Technical | `JetBrains Mono`, `Consolas`, `Cascadia Mono` | buttons, metadata, statuses, code |
| Reading | `Rajdhani` | readable supporting copy |
| Long-form/code-like content | `JetBrains Mono` | prompts, message text, file content |

Use `font-display` for headings and `font-technical`/`font-mono` for operational
content. Labels use the existing `tech-label` pattern: small, uppercase, tracked,
and often prefixed with `//`.

### Shape, spacing, and depth

- Use `rounded` (`8px`) for controls and list items.
- Use `rounded-lg` only for larger interactive groups.
- Use `panel` (`border`, `surface-2`, bottom-right `14px` radius) for major regions.
- Use `rounded-tr-none` or `rounded-tl-none` to distinguish message direction.
- Use the existing `shadow-neon-*` utilities only for focused or important surfaces.
- Prefer `p-3` for controls, `p-4` for compact sections, and `p-6` for dialogs and
  major panels.
- Use `gap-2` for controls and `gap-4`/`gap-6` for sections.

## 3. Application shell

### Global navigation

The top navigation in [`src/components/Navbar.jsx`](src/components/Navbar.jsx) is
the global shell:

- `surface-1` background with a `line` bottom border;
- 56px height;
- centered `max-w-7xl` content;
- `JADE` in cyan display type;
- Home, Chat, and Settings links;
- active route shown by a yellow bottom border and yellow text;
- inactive links use muted text and gain a line/text contrast on hover.

Keep navigation stable across pages. Do not put task-specific controls in the global
bar.

### Page container

Pages use a centered `max-w-7xl` region with horizontal padding and generous vertical
spacing. Page headers should align the title on the left and a status or primary action
on the right.

### Responsive behavior

- At desktop widths, Chat is a two-region workspace: a roughly 320px conversation
  rail and a flexible chat region.
- At narrow widths, collapse the rail into a drawer or stacked region; preserve access
  to conversation search and New Chat.
- Dialogs should remain within the viewport with scrollable content.
- Do not reduce body text below a readable size to preserve a two-column layout.

## 4. Core surfaces

### Home / task surface

[`src/pages/HomePage.jsx`](src/pages/HomePage.jsx) demonstrates the standard task
pattern:

1. page title and a [`StatusBadge`](src/components/StatusBadge.jsx);
2. a `panel` containing labeled inputs;
3. one primary yellow action or one pink cancel action;
4. [`ProgressBar`](src/components/ProgressBar.jsx) for active work;
5. a pink error callout below the action area.

The primary action is disabled until required input exists. Running state replaces
“Run” with “Cancel” rather than showing two competing actions.

### Conversation rail

[`src/components/layout/Sidebar.jsx`](src/components/layout/Sidebar.jsx) is a
technical index, not a decorative sidebar:

- header label: `// conversations`;
- monospace search input with `// search conversations` placeholder;
- cyan New Chat action;
- active row: cyan-tinted surface, yellow left rule, cyan text;
- inactive row: muted text with surface-3 hover;
- timestamps are dim monospace relative times;
- rename is inline and supports Enter, Escape, blur, save, and cancel;
- deletion requires confirmation.

Empty states should distinguish “no conversations yet” from “no matching
conversations.”

### Chat workspace

[`src/pages/ChatPage.jsx`](src/pages/ChatPage.jsx) composes the conversation rail,
mode selection, chat view, save-to-vault behavior, and processing feedback.

The chat region should provide:

- a clear conversation/model header;
- message history with enough width for Markdown;
- a fixed input band separated by a `line` border;
- visible streaming and processing states;
- attachment chips and retrieval sources when applicable;
- no hidden failure state when Ollama or the vault is unavailable.

### Messages

[`src/components/chat/MessageBubble.jsx`](src/components/chat/MessageBubble.jsx)
defines directional hierarchy:

- user messages are right-aligned, surface-3, cyan border, and a yellow left rule;
- assistant messages are left-aligned, surface-2, and use the standard line border;
- user bubbles have a squared top-right corner;
- assistant bubbles have a squared top-left corner;
- content is readable monospace with relaxed line height;
- actions appear on hover but remain keyboard reachable.

Assistant content is Markdown. Code blocks, links, lists, and headings must retain
strong contrast and must not visually resemble an interactive destructive control.

### Composer

[`src/components/chat/ChatInput.jsx`](src/components/chat/ChatInput.jsx) is the
primary command surface:

- textarea uses surface-3, a line border, and the cyan focus ring;
- Enter sends; Shift+Enter creates a new line; Escape closes mode suggestions;
- `/` opens filtered mode suggestions;
- the attachment control is secondary and cyan on hover;
- Send is yellow; Stop replaces it while streaming;
- the active mode is repeated beneath the composer as cyan technical metadata.

Slash suggestions should be positioned close to the composer, use the same surface
and border tokens, and keep the active mode visibly selected.

## 5. Modes and prompt configuration

Modes are first-class product objects. The bundled modes in
[`resources/modes`](resources/modes) include summary, how-to, study questions,
flashcards, project planning, drafting, explanation, knowledge notes, comparison,
journal digest, code help, brainstorming, and related workflows.

### Mode picker

[`src/components/modes/ModePicker.jsx`](src/components/modes/ModePicker.jsx):

- label the control `// mode`;
- show the slash command, name, and model;
- use a surface-3 select with a cyan focus ring;
- keep “default” available even when no custom mode is active.

### Mode editor

[`src/components/modes/ModeEditor.jsx`](src/components/modes/ModeEditor.jsx) uses
the same panel and form language as Settings:

- two-column fields on desktop, one column on narrow widths;
- labels describe the data key (`// id`, `// model`, `// temperature`);
- prompt and template text areas use monospace;
- Save is yellow, Cancel is neutral, Delete is pink;
- required-field errors are explicit;
- rules and examples are editable repeated rows, not comma-separated hidden data.

### Mode testing

[`src/components/modes/ModeTestPanel.jsx`](src/components/modes/ModeTestPanel.jsx)
must make the test loop obvious: sample input, Test action, streaming/Testing state,
and a bounded output surface. Errors belong inside the output area as readable
technical feedback.

## 6. Files, vault, and retrieval

### Attachments

Supported file types are `.txt`, `.md`, `.pdf`, and `.docx`.
[`src/components/files/AttachFileDialog.jsx`](src/components/files/AttachFileDialog.jsx)
uses a modal with:

- drag-and-drop target with dashed border;
- Browse files fallback;
- supported-type hint;
- attached file list with word counts;
- per-file removal;
- disabled Attach while processing.

[`src/components/files/AttachmentChip.jsx`](src/components/files/AttachmentChip.jsx)
uses type semantics: TXT cyan, Markdown green, PDF pink, and DOCX magenta.
Preserve the filename and word count; do not rely on the color badge alone.

### Vault saving

[`src/components/chat/SaveToVaultDialog.jsx`](src/components/chat/SaveToVaultDialog.jsx)
is a wide editor dialog. Keep vault path, folder, title, tags, Markdown body, and
existing-note link suggestions visually separate. If the vault is not configured,
show a pink callout and disable saving rather than silently failing.

### Processing and RAG

[`src/components/files/ProcessingProgress.jsx`](src/components/files/ProcessingProgress.jsx)
is a blocking progress surface for document and batch work:

- show the operation title and current stage;
- show `Part n of total` and percentage when totals exist;
- use yellow progress;
- show Completed in green and Error in pink;
- allow cancellation while work is active;
- change the action to Close after completion or error.

RAG indexing/search should expose source context when available. A retrieval failure
must not look like a successful empty result.

## 7. States and feedback

### Status badges

[`src/components/StatusBadge.jsx`](src/components/StatusBadge.jsx) defines the
canonical status mapping:

| Status | Treatment |
|---|---|
| Idle | surface-3, muted, line border |
| Running | cyan-tinted surface, cyan text |
| Complete | green-tinted surface, green text |
| Error | pink-tinted surface, pink text |

Use uppercase technical labels, but pair them with nearby descriptive copy when the
state is not self-explanatory.

### Loading and streaming

[`src/components/chat/StreamingIndicator.jsx`](src/components/chat/StreamingIndicator.jsx)
uses three cyan pulsing dots. Keep the indicator small and adjacent to the active
assistant response; it should not replace the response content or imply completion.

### Focus and keyboard access

Use the shared `.focus-ring`: a 2px cyan outline with a 3px offset. Every input,
button, select, dialog close action, mode suggestion, and message action must have a
visible focus state. Hover-only actions must still be reachable and understandable
with keyboard focus.

### Errors

Errors use a pink-tinted surface, pink border, and monospace message. Include the
actionable cause where possible, such as “Start Ollama and try again” or “Configure
an Obsidian vault path in Settings.” Avoid silent catches and success-shaped
fallbacks.

## 8. Settings information architecture

Settings is a control center, not a miscellaneous form. Keep related controls grouped
and titled with the existing technical-label convention:

- personal context / About Me;
- Obsidian vault path;
- model and Ollama availability;
- prompt modes;
- batch processing and folder watching;
- startup behavior;
- backup and restore;
- application lock.

Each group should expose current state, the primary action, and failure feedback.
Long forms should be sectioned into panels with consistent spacing. Destructive
operations such as reset, delete, restore, and lock removal require confirmation.

## 9. Component recipes

### Panel

```jsx
<section className="panel p-6 space-y-4">
  <h2 className="font-display font-bold text-text">Section title</h2>
  {/* content */}
</section>
```

### Technical label

```jsx
<label className="tech-label text-muted mb-1 block">// field name</label>
```

### Text input

```jsx
<input
  className="w-full bg-surface-3 border border-line rounded px-3 py-2
             text-text focus-ring font-mono text-sm"
/>
```

### Primary and destructive actions

```jsx
<button className="px-4 py-2 rounded bg-yellow text-black
                   font-technical font-bold">
  Save
</button>

<button className="px-4 py-2 rounded bg-pink text-text
                   font-technical font-bold">
  Cancel
</button>
```

Prefer existing Tailwind tokens and utilities over custom CSS. Add a new token only
when the meaning is shared by multiple surfaces.

## 10. Quality checklist

Before shipping a UI change, verify:

- [ ] The feature uses the existing token names and does not introduce arbitrary neon
      colors.
- [ ] Primary, secondary, destructive, disabled, hover, and focus states are distinct.
- [ ] Async work exposes running, complete, error, and cancellation behavior.
- [ ] Required fields and unavailable services have explicit feedback.
- [ ] Keyboard behavior is documented and works without a pointer.
- [ ] Dialogs are bounded, closable, and usable at narrow widths.
- [ ] Empty states distinguish absence from filtered results.
- [ ] Long Markdown, filenames, prompts, and paths wrap or scroll safely.
- [ ] Status meaning is not conveyed by color alone.
- [ ] New UI follows the component patterns in the relevant source file rather than
      duplicating a near-identical style.
- [ ] `npm run lint` and `npm run build:react` pass after implementation changes.

## 11. Source map

| Design area | Primary implementation |
|---|---|
| Global tokens and focus ring | [`src/index.css`](src/index.css) |
| Tailwind tokens and type | [`tailwind.config.js`](tailwind.config.js) |
| Application routes and shell | [`src/App.jsx`](src/App.jsx) |
| Global navigation | [`src/components/Navbar.jsx`](src/components/Navbar.jsx) |
| Chat composition | [`src/pages/ChatPage.jsx`](src/pages/ChatPage.jsx) |
| Conversation rail | [`src/components/layout/Sidebar.jsx`](src/components/layout/Sidebar.jsx) |
| Message presentation | [`src/components/chat/MessageBubble.jsx`](src/components/chat/MessageBubble.jsx) |
| Composer and slash modes | [`src/components/chat/ChatInput.jsx`](src/components/chat/ChatInput.jsx) |
| Attachments | [`src/components/files/AttachFileDialog.jsx`](src/components/files/AttachFileDialog.jsx) |
| Processing feedback | [`src/components/files/ProcessingProgress.jsx`](src/components/files/ProcessingProgress.jsx) |
| Prompt mode editing | [`src/components/modes/ModeEditor.jsx`](src/components/modes/ModeEditor.jsx) |
| Settings control center | [`src/pages/SettingsPage.jsx`](src/pages/SettingsPage.jsx) |
| Status and progress primitives | [`src/components/StatusBadge.jsx`](src/components/StatusBadge.jsx), [`src/components/ProgressBar.jsx`](src/components/ProgressBar.jsx) |

