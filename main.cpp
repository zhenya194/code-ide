#include <QApplication>
#include "mainwindow.h"

int main(int argc, char *argv[]) {
    QApplication a(argc, argv);
    
    MainWindow w;
    w.setWindowTitle("Gemini Glass IDE Pro [NATIVE C++]");
    w.resize(1300, 850);
    w.show();
    
    return a.exec();
}
