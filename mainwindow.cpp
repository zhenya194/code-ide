#include "mainwindow.h"
#include "highlighter.h"
#include <QHeaderView>
#include <QFile>
#include <QTextStream>
#include <QShortcut>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setupUI();
    applyTheme();

    terminalProcess = new QProcess(this);
    terminalProcess->setProcessChannelMode(QProcess::MergedChannels);
    connect(terminalProcess, &QProcess::readyReadStandardOutput, this, &MainWindow::handleTerminalOutput);
    
    QString rootPath = QDir::currentPath();
    fileModel->setRootPath(rootPath);
    fileTree->setRootIndex(fileModel->index(rootPath));
}

MainWindow::~MainWindow() {
    if (terminalProcess->state() == QProcess::Running) {
        terminalProcess->terminate();
    }
}

void MainWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    auto *mainLayout = new QHBoxLayout(centralWidget);
    mainLayout->setContentsMargins(10, 10, 10, 10);
    mainLayout->setSpacing(0);

    auto *mainSplitter = new QSplitter(Qt::Horizontal);

    fileTree = new QTreeView();
    fileModel = new QFileSystemModel(this);
    fileModel->setReadOnly(true);
    fileTree->setModel(fileModel);
    fileTree->setFixedWidth(260);
    fileTree->header()->hide();
    for (int i = 1; i < fileModel->columnCount(); ++i) fileTree->hideColumn(i);
    connect(fileTree, &QTreeView::doubleClicked, this, &MainWindow::openFile);

    auto *rightSplitter = new QSplitter(Qt::Vertical);

    tabWidget = new QTabWidget();
    tabWidget->setTabsClosable(true);
    tabWidget->setMovable(true);
    connect(tabWidget, &QTabWidget::tabCloseRequested, this, &MainWindow::closeTab);

    aiCommandBar = new QLineEdit();
    aiCommandBar->setPlaceholderText(" ✨ Ask AI to generate or refactor code... (Ctrl+J)");
    aiCommandBar->setFixedHeight(45);

    auto *terminalContainer = new QWidget();
    auto *termLayout = new QVBoxLayout(terminalContainer);
    termLayout->setContentsMargins(15, 15, 15, 15);
    
    terminalOutput = new QPlainTextEdit();
    terminalOutput->setReadOnly(true);
    terminalOutput->setPlaceholderText("Terminal output...");
    
    terminalInput = new QLineEdit();
    terminalInput->setPlaceholderText("➜ Type command and press Enter...");
    connect(terminalInput, &QLineEdit::returnPressed, this, &MainWindow::runTerminalCommand);

    termLayout->addWidget(terminalOutput);
    termLayout->addWidget(terminalInput);

    rightSplitter->addWidget(tabWidget);
    rightSplitter->addWidget(aiCommandBar);
    rightSplitter->addWidget(terminalContainer);
    rightSplitter->setStretchFactor(0, 4);
    rightSplitter->setStretchFactor(2, 1);

    mainSplitter->addWidget(fileTree);
    mainSplitter->addWidget(rightSplitter);

    mainLayout->addWidget(mainSplitter);
    setCentralWidget(centralWidget);
}

void MainWindow::openFile(const QModelIndex &index) {
    if (fileModel->isDir(index)) return;

    QString filePath = fileModel->filePath(index);
    QFile file(filePath);
    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        auto *editor = new QPlainTextEdit();
        
        QFont font("JetBrains Mono", 11);
        editor->setFont(font);
        editor->setTabStopDistance(4 * editor->fontMetrics().horizontalAdvance(' '));
        
        new Highlighter(editor->document());
        
        editor->setPlainText(file.readAll());
        int tabIdx = tabWidget->addTab(editor, fileModel->fileName(index));
        tabWidget->setCurrentIndex(tabIdx);
        file.close();
    }
}

void MainWindow::runTerminalCommand() {
    QString cmd = terminalInput->text();
    terminalOutput->appendPlainText("➜ " + cmd);
    
#ifdef Q_OS_WIN
    terminalProcess->start("cmd.exe", QStringList() << "/c" << cmd);
#else
    terminalProcess->start("sh", QStringList() << "-c" << cmd);
#endif
    terminalInput->clear();
}

void MainWindow::handleTerminalOutput() {
    terminalOutput->appendPlainText(terminalProcess->readAllStandardOutput());
}

void MainWindow::closeTab(int index) {
    QWidget* widget = tabWidget->widget(index);
    tabWidget->removeTab(index);
    delete widget;
}

void MainWindow::applyTheme() {
    this->setStyleSheet(R"(
        QMainWindow { background-color: #050508; }
        QWidget { color: #e2e8f0; font-family: 'Segoe UI', 'Inter'; }
        QTreeView {
            background-color: #0a0a0f;
            border: none;
            border-right: 1px solid #1a1a1f;
            padding: 10px;
            outline: none;
        }
        QTreeView::item { padding: 8px; border-radius: 6px; }
        QTreeView::item:hover { background-color: #1a1a25; }
        QTreeView::item:selected { background-color: #1e1e30; color: #3b82f6; }
        QTabWidget::pane { border: none; background: #050508; }
        QTabBar::tab {
            background: #0f0f15;
            padding: 10px 20px;
            margin-right: 2px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            color: #64748b;
        }
        QTabBar::tab:selected { background: #1a1a25; color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        QPlainTextEdit {
            background-color: #050508;
            border: none;
            padding: 20px;
            selection-background-color: #3b82f6;
        }
        QLineEdit {
            background: #101018;
            border: 1px solid #1a1a1f;
            border-radius: 12px;
            padding: 10px 15px;
            color: #fff;
            selection-background-color: #3b82f6;
        }
        QLineEdit:focus { border: 1px solid #3b82f6; background: #151520; }
        QSplitter::handle { background: #1a1a1f; }
    )");
}
