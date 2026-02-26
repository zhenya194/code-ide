#include "highlighter.h"

Highlighter::Highlighter(QTextDocument *parent) : QSyntaxHighlighter(parent) {
    HighlightingRule rule;

    QTextCharFormat keywordFormat;
    keywordFormat.setForeground(QColor("#ff79c6"));
    keywordFormat.setFontWeight(QFont::Bold);
    
    // Using raw strings to avoid backslash escaping issues in C++
    QStringList keywordPatterns = {
        R"(\bchar\b)", R"(\bclass\b)", R"(\bconst\b)", R"(\bdouble\b)", R"(\benum\b)",
        R"(\bexplicit\b)", R"(\bexport\b)", R"(\bextern\b)", R"(\bfloat\b)", R"(\bfor\b)",
        R"(\bif\b)", R"(\binline\b)", R"(\bint\b)", R"(\blong\b)", R"(\bnamespace\b)",
        R"(\boperator\b)", R"(\bprivate\b)", R"(\bprotected\b)", R"(\bpublic\b)",
        R"(\bshort\b)", R"(\bsignals\b)", R"(\bsigned\b)", R"(\bslots\b)", R"(\bstatic\b)",
        R"(\bstruct\b)", R"(\btemplate\b)", R"(\btypedef\b)", R"(\btypename\b)",
        R"(\bunion\b)", R"(\bunsigned\b)", R"(\bvirtual\b)", R"(\bvoid\b)", R"(\bvolatile\b)", R"(\bwhile\b)",
        R"(\breturn\b)", R"(\bswitch\b)", R"(\bcase\b)", R"(\bdefault\b)", R"(\bdo\b)", R"(\bgoto\b)"
    };

    for (const QString &pattern : keywordPatterns) {
        rule.pattern = QRegularExpression(pattern);
        rule.format = keywordFormat;
        highlightingRules.append(rule);
    }

    QTextCharFormat stringFormat;
    stringFormat.setForeground(QColor("#f1fa8c"));
    rule.pattern = QRegularExpression(R"(".+")"); // Simple string pattern
    rule.format = stringFormat;
    highlightingRules.append(rule);

    QTextCharFormat commentFormat;
    commentFormat.setForeground(QColor("#6272a4"));
    rule.pattern = QRegularExpression(R"(//[^\n]*)"); // Single line comment
    rule.format = commentFormat;
    highlightingRules.append(rule);
    
    // Multi-line comment (simplified for block highlighting)
    rule.pattern = QRegularExpression(R"(/\*.*\*/)");
    rule.format = commentFormat;
    highlightingRules.append(rule);
}

void Highlighter::highlightBlock(const QString &text) {
    for (const HighlightingRule &rule : highlightingRules) {
        QRegularExpressionMatchIterator matchIterator = rule.pattern.globalMatch(text);
        while (matchIterator.hasNext()) {
            QRegularExpressionMatch match = matchIterator.next();
            setFormat(match.capturedStart(), match.capturedLength(), rule.format);
        }
    }
}
