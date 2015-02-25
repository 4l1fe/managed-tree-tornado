import tornado.ioloop
import psycopg2
from os.path import dirname, join
from tornado.web import RequestHandler, Application, url
from okato import dsn


class Init:

    def initialize(self):
        self.conn = psycopg2.connect(dsn)
        self.cur = self.conn.cursor()
        self.limit = 2000;


class MainHandler(Init, RequestHandler):

    common_query = """WITH filtered AS (
                            SELECT code,
                                   name
                            FROM okato
                            WHERE code ~ '*{0,%s}'
                            ORDER BY code
                            LIMIT %s
                            )
                        SELECT replace(ltree2text(t1.code), '.', '_') AS code,
                               nlevel(t1.code) AS lvl,
                               EXISTS(SELECT 1
                                      FROM okato AS t2
                                      WHERE t1.code @> t2.code
                                            AND t1.code <> t2.code) AS is_ancestor,
                               t1.name AS name
                        FROM filtered AS t1;"""

    def get(self):
        """Можно указывать начальный уровень параметром  ?lvl=n"""
        try:
            start_lvl = int(self.get_query_argument('lvl', 1))
        except ValueError:
            start_lvl = 1
        self.cur.execute("""SELECT max(nlevel(code))
                            FROM okato;""")
        lvls = self.cur.fetchone()[0]
        lvls = range(1, lvls+1)
        self.cur.execute(self.common_query, (start_lvl, self.limit))  # replace() из-за ошибки
                                                                                  # в поиске по селектору
        column_names = [c[0] for c in self.cur.description]
        rows = [dict(zip(column_names, row)) for row in self.cur]
        self.render("static/tree.html", rows=rows, lvls=lvls, start_lvl=start_lvl)

    def post(self):
        try:
            lvl = int(self.get_body_argument('lvl', 0))
        except ValueError:
            lvl = 0
        if lvl:
            self.cur.execute(self.common_query, (lvl, self.limit))

            column_names = [c[0] for c in self.cur.description]
            rows = [dict(zip(column_names, row)) for row in self.cur]  # при сериализации в json порциями
            self.write({'rows': rows})                                 # возникают ошибки
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
        st = self.get_query_argument('searched_text', '').strip()
        if st:
            self.cur.execute("""WITH search_result AS (
                                     SELECT code,
                                            name
                                     FROM okato
                                     WHERE name_vector @@ plainto_tsquery('russian', %s)
                                     ORDER BY code
                                     LIMIT %s
                                     ), filtered AS (
                                     SELECT code,
                                            name
                                     FROM okato
                                     WHERE code @> ARRAY(select code from search_result)
                                     LIMIT %s
                                     )
                                SELECT replace(ltree2text(t1.code), '.', '_') AS code,
                                       nlevel(t1.code) AS lvl,
                                       EXISTS(SELECT 1
                                              FROM okato AS t2
                                              WHERE t1.code @> t2.code
                                                    AND t1.code <> t2.code) AS is_ancestor,
                                       t1.name AS name
                                FROM filtered as t1;""", (st, self.limit, self.limit))

            column_names = [c[0] for c in self.cur.description]
            rows = [dict(zip(column_names, row)) for row in self.cur]
            self.write({'rows': rows})
        self.flush()


if __name__ == "__main__":
    application = Application(
        [url(r"/", MainHandler),
         url(r"/manage", ManageHandler),
         url(r"/search", SearchHandler)],
        static_path=join(dirname(__file__), 'static'),
        compiled_template_cache=False,
        compress_response=True,
        autoreload=False)

    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()