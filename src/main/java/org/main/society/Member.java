package org.main.society;

public class Member {
    private int srNo;
    private String name;
    private String phone;
    private String address;

    public Member(int srNo, String name, String phone, String address) {
        this.srNo = srNo;
        this.name = name;
        this.phone = phone;
        this.address = address;
    }

    // Getters and setters required for JavaFX PropertyValueFactory
    public int getSrNo() { return srNo; }
    public void setSrNo(int srNo) { this.srNo = srNo; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
