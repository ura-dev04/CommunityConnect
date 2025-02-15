package org.main.society;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import java.util.Map;

public class Controller {
    @FXML private TextField srNoField;
    @FXML private TextField nameField;
    @FXML private TextField phoneField;
    @FXML private TextField addressField;
    
    @FXML private TableView<Member> memberTable;
    @FXML private TableColumn<Member, Integer> srNoColumn;
    @FXML private TableColumn<Member, String> nameColumn;
    @FXML private TableColumn<Member, String> phoneColumn;
    @FXML private TableColumn<Member, String> addressColumn;

    private ObservableList<Member> membersList = FXCollections.observableArrayList();

    @FXML
    public void initialize() {
        // Initialize table columns
        srNoColumn.setCellValueFactory(new PropertyValueFactory<>("srNo"));
        nameColumn.setCellValueFactory(new PropertyValueFactory<>("name"));
        phoneColumn.setCellValueFactory(new PropertyValueFactory<>("phone"));
        addressColumn.setCellValueFactory(new PropertyValueFactory<>("address"));
        
        memberTable.setItems(membersList);
        
        // Load initial data
        handleRefresh();
    }

    @FXML
    private void handleAddMember() {
        try {
            int srNo = Integer.parseInt(srNoField.getText());
            String name = nameField.getText();
            String phone = phoneField.getText();
            String address = addressField.getText();

            if (name.isEmpty() || phone.isEmpty() || address.isEmpty()) {
                showAlert("Error", "Please fill all fields");
                return;
            }

            Member member = new Member(srNo, name, phone, address);
            Firebase.pushMember(member);  // Removed response variable
            
            clearFields();
            handleRefresh();
            showAlert("Success", "Member added successfully!");
            
        } catch (NumberFormatException e) {
            showAlert("Error", "Sr. No must be a number");
        } catch (Exception e) {
            showAlert("Error", "Error adding member: " + e.getMessage());
        }
    }

    @FXML
    private void handleRefresh() {
        try {
            Map<String, Member> members = Firebase.getAllMembers();
            membersList.clear();
            membersList.addAll(members.values());
        } catch (Exception e) {
            showAlert("Error", "Error loading members: " + e.getMessage());
        }
    }

    private void clearFields() {
        srNoField.clear();
        nameField.clear();
        phoneField.clear();
        addressField.clear();
    }

    private void showAlert(String title, String content) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(title);
        alert.setContentText(content);
        alert.showAndWait();
    }
}
