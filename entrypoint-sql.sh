#!/bin/bash

# Ensure /var/opt/mssql/data has the correct ownership
chown -R mssql /var/opt/mssql/data

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &

# Wait for SQL Server to start up
sleep 10

# Run the initialization script
# TODO: Pass the password securely
/opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P 'MySecureP@ss123' -i /docker-entrypoint-initdb.d/init.sql -C

# Wait for SQL Server to exit
wait
