import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const incomingConfig = req.body;
      console.log('Received config for update:', incomingConfig);

      const configPath = path.join(process.cwd(), 'public', 'config', 'config_mark.yml');
      let existingConfig = {};

      // Check if the config file exists and read it
      if (fs.existsSync(configPath)) {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        existingConfig = yaml.load(fileContents);
      }

      // Merge the incoming config with the existing config
      // This ensures that only provided fields are updated and others are retained
      const mergedConfig = { ...existingConfig, ...incomingConfig };

      // Convert merged config to YAML
      const yamlConfig = yaml.dump(mergedConfig);

      // Write the YAML content to the file
      fs.writeFileSync(configPath, yamlConfig, 'utf8');

      res.status(200).json({ message: 'Config updated successfully!' });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ message: 'Failed to update config', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
