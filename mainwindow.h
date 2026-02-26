#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QTreeView>
#include <QFileSystemModel>
#include <QTabWidget>
#include <QPlainTextEdit>
#include <QLineEdit>
#include <QProcess>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QSplitter>
#include <QDir>

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void openFile(const QModelIndex &index);
    void runTerminalCommand();
    void closeTab(int index);
    void handleTerminalOutput();

private:
    void setupUI();
    void applyTheme();
    
    QTreeView *fileTree;
    QFileSystemModel *fileModel;
    QTabWidget *tabWidget;
    QPlainTextEdit *terminalOutput;
    QLineEdit *terminalInput;
    QLineEdit *aiCommandBar;
    QProcess *terminalProcess;
};

#endif
