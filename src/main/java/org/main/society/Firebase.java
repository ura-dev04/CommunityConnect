package org.main.society;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

public class Firebase {
    private static final String DATABASE_URL = "https://society-management-44-default-rtdb.firebaseio.com/";
    
    // Add your database secret or API key here
    private static final String AUTH_PARAM = "?auth=YOUR_FIREBASE_DATABASE_SECRET";
    
    private static final String MEMBERS_NODE = "members";

    public static void main(String[] args) {
        // Create a new member
        Member member = new Member(2, "Ben Dover", "1234567890", "KC college here");
        
        try {
            // Push member data to Firebase
            String response = pushMember(member);
            System.out.println("Response from Firebase: " + response);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Pushes a new member to the Firebase Realtime Database using HTTP POST.
     *
     * @param member the member object to store
     * @return the response from Firebase (usually contains the generated key)
     * @throws IOException if an I/O error occurs
     */
    public static String pushMember(Member member) throws IOException {
        // Convert member object to a JSON string.
        // For production, consider using a JSON library like Gson.
        String jsonPayload = String.format(
            "{\"sr_no\":%d,\"name\":\"%s\",\"phone\":\"%s\",\"address\":\"%s\"}",
            member.getSrNo(), member.getName(), member.getPhone(), member.getAddress()
        );

        // Add auth parameter to URL
        String urlString = DATABASE_URL + MEMBERS_NODE + ".json" + AUTH_PARAM;
        URL url = URI.create(urlString).toURL();
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json; utf-8");
        connection.setDoOutput(true);

        // Write the JSON payload to the request body.
        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }

        // Read the response from Firebase.
        int responseCode = connection.getResponseCode();
        InputStream is = (responseCode >= 200 && responseCode < 300) 
                         ? connection.getInputStream() 
                         : connection.getErrorStream();
                         
        StringBuilder response = new StringBuilder();
        try (BufferedReader in = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) {
                response.append(line.trim());
            }
        }

        // Improve error handling
        if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_CREATED) {
            throw new IOException("Firebase request failed with response code: " + responseCode + 
                                "\nResponse: " + response.toString());
        }

        return response.toString();
    }

    public static Map<String, Member> getAllMembers() throws IOException {
        String urlString = DATABASE_URL + MEMBERS_NODE + ".json" + AUTH_PARAM;
        URL url = URI.create(urlString).toURL();
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");

        int responseCode = connection.getResponseCode();
        InputStream is = (responseCode >= 200 && responseCode < 300) 
                         ? connection.getInputStream() 
                         : connection.getErrorStream();

        StringBuilder response = new StringBuilder();
        try (BufferedReader in = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) {
                response.append(line);
            }
        }

        if (responseCode != HttpURLConnection.HTTP_OK) {
            throw new IOException("Failed to get members. Response code: " + responseCode);
        }

        Map<String, Member> members = new HashMap<>();
        JSONObject jsonResponse = new JSONObject(response.toString());
        
        if (!jsonResponse.isEmpty()) {
            for (String key : jsonResponse.keySet()) {
                JSONObject memberJson = jsonResponse.getJSONObject(key);
                Member member = new Member(
                    memberJson.getInt("sr_no"),
                    memberJson.getString("name"),
                    memberJson.getString("phone"),
                    memberJson.getString("address")
                );
                members.put(key, member);
            }
        }

        return members;
    }
}
