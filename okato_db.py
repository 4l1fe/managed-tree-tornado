import csv
import psycopg2


db_settings = {'dbname': 'tree', 'host': '127.0.0.1', 'user': 'postgres', 'password': 'postgres'}
dsn = 'dbname={dbname} host={host} user={user} password={password}'.format(**db_settings)


def main():
    #TODO: построить индекс
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("""drop table if exists okato;""")
    cur.execute("""create extension if not exists ltree;""")  # необходим установленный системный пакет postgresql-contrib
    cur.execute("""create table if not exists okato (
                          id serial primary key,
                          code ltree,
                          razdel smallint,
                          name varchar,
                          centrum varchar);""")
    cur.execute("""delete from okato;""")
    conn.commit()

    #TODO: запилить на генераторе
    with open('okato_utf.csv') as file:
        okato = []
        reader = csv.DictReader(file, delimiter=';')
        for i, row in enumerate(reader, start=1):
            razdel, name, centrum = row['#Razdel'], row['Name1'], row['Centrum']
            code, code1, code2, code3 = [row['Ter'].lstrip('0')], row['Kod1'], row['Kod2'], row['Kod3']
            if not int(code1) == 0:  # убираем лишние ltree labels
                code.append(code1)
            if not int(code2) == 0:
                code.append(code2)
            if not int(code3) == 0:
                code.append(code3)
            code = '.'.join(code)
            okato.append([code, razdel, name, centrum])
            if i >= 20000: break

    args = ','.join([cur.mogrify("(%s,%s,%s,%s)", row).decode() for row in okato])
    cur.execute("""insert into okato (code, razdel, name, centrum) values """ + args)  # мульти вставка
    conn.commit()


if __name__ == '__main__':
    main()