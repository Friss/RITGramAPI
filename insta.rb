require 'pg'
require 'json'
require 'hashie'
require "yaml"

class PostgresDirect
  # Create the connection instance.
  def connect
    @conn = PG.connect(
        :dbname => 'zfriss',
        :user => 'zfriss',
        :password => '')
  end

  # Create our test table (assumes it doesn't already exist)
  def createUserTable
    @conn.exec("CREATE TABLE users (id serial NOT NULL, name character varying(255), CONSTRAINT users_pkey PRIMARY KEY (id)) WITH (OIDS=FALSE);");
  end

  # When we're done, we're going to drop our test table.
  def dropUserTable
    @conn.exec("DROP TABLE users")
  end

  # Prepared statements prevent SQL injection attacks.  However, for the connection, the prepared statements
  # live and apparently cannot be removed, at least not very easily.  There is apparently a significant
  # performance improvement using prepared statements.
  def prepareInsertUserStatement
    @conn.prepare("update_insta", "UPDATE instagram_items set full_data = $1 WHERE id = $2")
  end

  # Add a user with the prepared statement.
  def updateInsta(full_data, id)
    @conn.exec_prepared("update_insta", [full_data, id])
  end

  # Get our data back
  def queryUserTable
    @conn.exec( "SELECT * FROM instagram_items WHERE ID > 1" ) do |result|
      result.each do |row|
        yield row if block_given?
      end
    end
  end

  # Disconnect the back-end connection.
  def disconnect
    @conn.close
  end
end

def main
  p = PostgresDirect.new()
  p.connect
  begin
    p.prepareInsertUserStatement
    p.queryUserTable {|row| p.updateInsta(YAML.load(row['full_data']).to_json, row['id'])}
  rescue Exception => e
    puts e.message
    puts e.backtrace.inspect
  ensure
    p.disconnect
  end
end

main
