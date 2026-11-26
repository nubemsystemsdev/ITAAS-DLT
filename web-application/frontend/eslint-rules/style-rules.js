export const noStyleSrc = {
    meta: {
        type: "problem",
        docs: {
            description: 'Disallow <style src="..."> in Vue SFC files.',
        },
        schema: [],
        messages: {
            noStyleSrc: 'Do not use <style src="...">. Use a <style> block with @import "@/..." instead.',
        },
    },
    create(context) {
        return {
            Program(node) {
                const fileName = context.getFilename();
                if (!fileName.endsWith(".vue")) return;

                const sourceCode = context.getSourceCode();
                const sourceText = sourceCode.getText();

                if (/<style\b[^>]*\bsrc\s*=/i.test(sourceText)) {
                    context.report({
                        node,
                        messageId: "noStyleSrc",
                    });
                }
            },
        };
    },
};

export const requireStyleImportAlias = {
    meta: {
        type: "problem",
        docs: {
            description: "Require Vue <style> @import paths to use the @/ alias.",
        },
        schema: [],
        messages: {
            requireAliasImport: 'External stylesheet imports in <style> must use @/ alias (e.g. @import "@/style/layout/file.css").',
        },
    },
    create(context) {
        return {
            Program(node) {
                const fileName = context.getFilename();
                if (!fileName.endsWith(".vue")) return;

                const sourceCode = context.getSourceCode();
                const sourceText = sourceCode.getText();

                const styleBlocks = sourceText.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];

                for (const block of styleBlocks) {
                    const importRegex = /@import\s+(?:url\()?\s*["']([^"']+)["']/gi;
                    let match = importRegex.exec(block);

                    while (match) {
                        const importPath = match[1];
                        if (!importPath.startsWith("@/")) {
                            context.report({
                                node,
                                messageId: "requireAliasImport",
                            });
                            return;
                        }
                        match = importRegex.exec(block);
                    }
                }
            },
        };
    },
};
