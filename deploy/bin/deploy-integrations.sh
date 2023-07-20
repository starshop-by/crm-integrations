#!/bin/sh
ansible-playbook ./deploy-integrations.yml -i ./hosts/integrations-production --extra-vars "env=production" "$@"
