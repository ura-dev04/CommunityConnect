module hellofx {
    requires javafx.controls;
    requires javafx.fxml;
    requires transitive javafx.graphics;
    requires org.json;
    
    opens org.main.society to javafx.fxml;
    exports org.main.society;
}