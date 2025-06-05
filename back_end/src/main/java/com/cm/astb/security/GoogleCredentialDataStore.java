package com.cm.astb.security;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Base64;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.entity.User;
import com.cm.astb.repository.UserRepository;
import com.google.api.client.util.store.AbstractDataStore;
import com.google.api.client.util.store.DataStore;
import com.google.api.client.util.store.DataStoreFactory;


public class GoogleCredentialDataStore extends AbstractDataStore<Serializable>{
	
	private static final Logger logger = LoggerFactory.getLogger(GoogleCredentialDataStore.class);
	
	private final UserRepository userRepository;
	
	
	
	public GoogleCredentialDataStore(DataStoreFactory dataStoreFactory, String id, UserRepository userRepository) {
		super(dataStoreFactory, id);
		this.userRepository = userRepository;
	}
	
	@Override
	@Transactional	// DB changing
	public DataStore<Serializable> set(String googleId, Serializable value) throws IOException {
		logger.info("Setting Google Credential for user: {}", googleId);
		Optional<User> optionalUser = userRepository.findByGoogleId(googleId);
		
		if(optionalUser.isPresent()) {
			User user = optionalUser.get();
			
			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			ObjectOutputStream oos = new ObjectOutputStream(bos);
			oos.writeObject(value);
			oos.close();
			String credentialBase64 = Base64.getEncoder().encodeToString(bos.toByteArray());
			
			user.setGoogleRefreshToken(credentialBase64);
			userRepository.save(user);
			logger.info("Google Credential saved (Base64) for user: {}", googleId);
			
			return this;
		} else {
			logger.warn("User with googleId {} not found when trying to save refresh token.", googleId);
			throw new IOException("User not found: " + googleId);
		}
		
	}

	@Override
	public Serializable get(String googleId) throws IOException {
		logger.info("Getting Google RefreshToken for user: {}", googleId);

		Optional<User> optionalUser = userRepository.findByGoogleId(googleId);
		if (optionalUser.isPresent()) {
			
			User user = optionalUser.get();
			String credentialBase64 = user.getGoogleRefreshToken();
			if (credentialBase64 != null && !credentialBase64.isEmpty()) {
				
				byte[] decodeBytes = Base64.getDecoder().decode(credentialBase64);
				ByteArrayInputStream bis = new ByteArrayInputStream(decodeBytes);
				ObjectInputStream ois = new ObjectInputStream(bis);
				
				try {
					return (Serializable) ois.readObject();
				} catch (ClassNotFoundException e) {
					logger.error("Failed to deserialize Google Credential: Class not found for user {}",googleId,  e);
					throw new IOException("Failed to deserialize Credential: " + e.getMessage(), e);
				} finally {
					ois.close();
				}
			}
		}
		logger.warn("Google Credential (Base64) not found or empty for user: {}", googleId);
		return null;
	}
	
	@Override
	@Transactional	// DB changing
	public DataStore<Serializable> delete(String googleId) throws IOException {
		
		logger.info("Deleting Google Credential for user : {}", googleId);
		
		Optional<User> optionalUser = userRepository.findByGoogleId(googleId);
		if(optionalUser.isPresent()) {
			User user = optionalUser.get();
			user.setGoogleRefreshToken(null);
			userRepository.save(user);
			logger.info("Google Credential deleted for user: {}", googleId);
		} else {
			logger.warn("User with googleId {} not found whene trying to delete credential", googleId);
		}
		return this;
	}
	
	@Override
	@Transactional	// DB changing
	public DataStore<Serializable> clear() throws IOException {
		logger.warn("clear() method is called. This will clear ALL Credentials in DB.");
		userRepository.findAll().forEach(user -> user.setGoogleRefreshToken(null));	// Check the forEach() method.
		userRepository.saveAll(userRepository.findAll());
		return this;
	}
	
	@Override
	public Set<String> keySet() throws IOException {
		logger.info("Fetching all Google Credential keys.");
		return userRepository.findAll().stream()
				.filter(user -> user.getGoogleRefreshToken() != null && !user.getGoogleRefreshToken().isEmpty())
				.map(User::getGoogleId)
				.collect(Collectors.toSet());
	}

	@Override
	public Collection<Serializable> values() throws IOException {
		logger.warn("values() method is called. This will load all credentials and can be inefficient.");
		return userRepository.findAll().stream()
				.map(User::getGoogleRefreshToken)
				.filter(json -> json != null && !json.isEmpty())
				.map(json -> {
					try {
						byte[] decodedBytes = Base64.getDecoder().decode(json);
						ByteArrayInputStream bis = new ByteArrayInputStream(decodedBytes);
						ObjectInputStream ois = new ObjectInputStream(bis);
						Serializable obj = (Serializable) ois.readObject();
						ois.close();
						
						return obj;
					} catch (IOException | ClassNotFoundException e) {
						logger.error("Failed to deserialize credential in values(): {}", e.getMessage());
						return null;
					}
				})
				.filter(java.util.Objects::nonNull)
				.collect(Collectors.toList());
	}
	
	@Override
	public int size() throws IOException {
		logger.info("Counting stored Google Credential keys.");
		return keySet().size();
	}
	
	@Override
	public boolean isEmpty() throws IOException {
		return size() == 0;
	}
	
	@Override
	public boolean containsKey(String googleId) throws IOException {
		return userRepository.findByGoogleId(googleId)
				.map(User::getGoogleRefreshToken)
				.filter(token -> token != null && !token.isEmpty())
				.isPresent();
	}
	
	@Override
	public boolean containsValue(Serializable value) throws IOException {
		logger.warn("containsValue() method is calleed. This can be very inefficient.");
		return values().contains(value);
	}
	
	@Override
	public DataStoreFactory getDataStoreFactory() {
		return super.getDataStoreFactory();
	}
	
}
