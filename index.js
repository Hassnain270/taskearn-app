import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

let AppComponent;
let loadError = null;

try {
  AppComponent = require('./App').default;
} catch (e) {
  loadError = e;
}

function Root() {
  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 60 }}>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
            CRASH ERROR:
          </Text>
          <Text style={{ color: '#FFD700', fontSize: 14 }}>
            {String(loadError.message)}
          </Text>
          <Text style={{ color: '#fff', fontSize: 11, marginTop: 15 }}>
            {String(loadError.stack)}
          </Text>
        </ScrollView>
      </View>
    );
  }
  return React.createElement(AppComponent);
}

registerRootComponent(Root);
