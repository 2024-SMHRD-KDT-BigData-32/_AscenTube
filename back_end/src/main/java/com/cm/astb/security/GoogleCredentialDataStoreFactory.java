package com.cm.astb.security;

import java.io.IOException;
import java.io.Serializable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Component;

import com.cm.astb.repository.UserRepository;
import com.google.api.client.util.store.DataStore;
import com.google.api.client.util.store.DataStoreFactory;

@Component
public class GoogleCredentialDataStoreFactory implements DataStoreFactory{
	
	private final UserRepository userRepository;
	private final ConcurrentMap<String, DataStore<? extends Serializable>> dataStoreMap = new ConcurrentHashMap<>();
	
	public GoogleCredentialDataStoreFactory(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	// Method creating certified id's new DataStore instance or load present DataStore instance from cache.
	@Override
	@SuppressWarnings("unchecked")
	public <V extends Serializable> DataStore<V> getDataStore(String id) throws IOException {
		DataStore<V> dataStore = (DataStore<V>) dataStoreMap.get(id);
		if (dataStore == null) {
			dataStore = (DataStore<V>) new GoogleCredentialDataStore(this, id, userRepository);
			dataStoreMap.put(id, dataStore);	// load to cache.
		}
		return dataStore;
	}
}
