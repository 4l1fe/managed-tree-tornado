import csv
import psycopg2


db_settings = {'dbname': 'tree', 'host': '127.0.0.1', 'user': 'postgres', 'password': 'postgres'}
dsn = 'dbname={dbname} host={host} user={user} password={password}'.format(**db_settings)


def main():
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("""DROP TABLE IF EXISTS okato;
                   CREATE EXTENSION IF NOT EXISTS ltree;  --необходим установленный системный пакет postgresql-contrib
                   CREATE TABLE okato (
                          id serial primary key,
                          code ltree,
                          razdel smallint,
                          name varchar,
                          centrum varchar,
                          name_vector tsvector);""")
    conn.commit()

    okato_file = open('okato_utf.csv')
    reader = csv.DictReader(okato_file, delimiter=';')
    def okato(reader):
        for i, row in enumerate(reader, start=1):
            razdel, name, centrum, name_vector = row['#Razdel'], row['Name1'], row['Centrum'], row['Name1']
            code, code1, code2, code3 = [row['Ter'].lstrip('0')], row['Kod1'], row['Kod2'], row['Kod3']
            if not int(code1) == 0:  # убираем лишние ltree labels
                code.append(code1)
            if not int(code2) == 0:
                code.append(code2)
            if not int(code3) == 0:
                code.append(code3)
            code = '.'.join(code)
            yield [code, razdel, name, centrum, name_vector]
            # if i >= 20000: break

    okato_gen = okato(reader)
    args = ','.join([cur.mogrify("(%s,%s,%s,%s, (to_tsvector('russian', %s)))", row).decode() for row in okato_gen])
    cur.execute("""INSERT INTO okato (code, razdel, name, centrum, name_vector) VALUES """ + args)  # мульти вставка
    cur.execute("""DELETE FROM okato where name like '%/';
                   CREATE INDEX name_vector_idx ON okato USING gin(name_vector);
                   CREATE INDEX code_gist_idx ON okato USING gist(code);
                   CREATE INDEX code_btree_idx ON okato USING btree(code);""")
    conn.commit()
    okato_file.close()


if __name__ == '__main__':
    main()