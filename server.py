import tornado.ioloop
import psycopg2
from os.path import dirname, join
from tornado.web import RequestHandler, Application, url
from okato_db import dsn


class Init:

    def initialize(self):
        self.conn = psycopg2.connect(dsn)
        self.cur = self.conn.cursor()
        self.page_rows_limit = 2000;


class MainHandler(Init, RequestHandler):

    def get(self):
        """Можно указывать начальный уровень параметром  ?lvl=n"""
        try:
            start_lvl = int(self.get_query_argument('lvl', 1))
        except ValueError:
            start_lvl = 1
        self.cur.execute("""SELECT max(nlevel(code)) FROM okato;;""")
        lvls = self.cur.fetchone()[0]
        lvls = range(1, lvls+1)
        self.cur.execute("""SELECT replace(ltree2text(t.code), '.', '_') AS code, nlevel(t.code) AS lvl, t.name
                            FROM (SELECT code, name FROM okato
                                  WHERE code ~ '*{0,%s}'
                                  ORDER BY code LIMIT %s) AS t;""", (start_lvl, self.page_rows_limit))  # replace() из-за ошибки в поиске по селектору

        column_names = [c[0] for c in self.cur.description]
        rows = [dict(zip(column_names, row)) for row in self.cur]
        self.render("static/tree.html", rows=rows, lvls=lvls, start_lvl=start_lvl)

    def post(self):
        try:
            lvl = int(self.get_body_argument('lvl', 0))
        except ValueError:
            lvl = 0
        if lvl:
            self.cur.execute("""SELECT replace(ltree2text(t.code), '.', '_') AS code, nlevel(t.code) AS lvl, t.name
                                FROM (SELECT code, name FROM okato
                                      WHERE code ~ '*{0,%s}'
                                      ORDER BY code LIMIT %s) AS t;""", (lvl, self.page_rows_limit))

            column_names = [c[0] for c in self.cur.description]
            rows = [dict(zip(column_names, row)) for row in self.cur]  # при сериализации в json порциями возникают ошибки
            self.write({'rows': rows})
        self.flush()


class ManageHandler(Init, RequestHandler):

    def post(self):
        code = self.get_body_argument('code').strip().replace('_', '.')  # из-за ошибки в поиске по селектору
        name = self.get_body_argument('name').strip()
        new_name = self.get_body_argument('new_name').strip()
        if all((code, name, new_name)):
            self.cur.execute("""UPDATE okato
                                SET name=%s
                                WHERE code=%s AND name=%s;""", (new_name, code, name))
            self.conn.commit()
            self.write({'success': True})
        self.flush()

    def delete(self):
        code = self.get_query_argument('code').strip().replace('_', '.')
        if code:
            self.cur.execute("""DELETE FROM okato
                                WHERE code <@ %s
                                RETURNING replace(ltree2text(code), '.','_') AS code;""", (code,))
            self.conn.commit()
            rows = self.cur.fetchall()
            self.write({'rows': rows})
        self.flush()


class SearchHandler(Init, RequestHandler):

    def get(self):
        st = self.get_query_argument('searched_text', '').strip().replace(' ', ' & ')
        # like_st = '%{}%'.format(st)  # mogrify() не справляется с такой подстановкой
        if st:
            query = self.cur.mogrify("""SELECT replace(ltree2text(code), '.', '_') AS code, nlevel(code) AS lvl, name
                                        FROM okato
                                        WHERE code @> ARRAY(SELECT code
                                                            FROM okato
                                                            WHERE name_vector @@ plainto_tsquery('russian', %s)
                                                            ORDER BY code LIMIT %s);""", (st, self.page_rows_limit))
            self.cur.execute(query)
            column_names = [c[0] for c in self.cur.description]
            rows = [dict(zip(column_names, row)) for row in self.cur]
            self.write({'rows': rows})
        self.flush()


if __name__ == "__main__":
    # TODO: сделать настраиваемые адреса/порты, исключения, обработка неверных параметров
    # Создание соединения на приложение(не на инициализацию обработчиков) вешает запросы из остальных
    application = Application(
        [url(r"/", MainHandler),
         url(r"/manage", ManageHandler),
         url(r"/search", SearchHandler)],
        static_path=join(dirname(__file__), 'static'),
        compiled_template_cache=False,
        compress_response=False,
        autoreload=False)

    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()