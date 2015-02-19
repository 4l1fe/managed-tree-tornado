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
        self.cur.execute("""select max(nlevel(code)) from okato;;""")
        lvls = self.cur.fetchone()[0]
        lvls = range(1, lvls+1)
        self.cur.execute("""select replace(ltree2text(t.code), '.', '_') as code, nlevel(t.code) as lvl, t.name
                            from (select code, name from okato
                                  where code ~ '*{0,%s}'
                                  order by code limit %s) as t;""", (start_lvl, self.page_rows_limit))  # replace() из-за ошибки в поиске по селектору

        column_names = [c[0] for c in self.cur.description]
        rows = [dict(zip(column_names, row)) for row in self.cur]
        self.render("static/tree.html", rows=rows, lvls=lvls, start_lvl=start_lvl)

    def post(self):
        try:
            lvl = int(self.get_body_argument('lvl', 0))
        except ValueError:
            lvl = 0
        if lvl:
            self.cur.execute("""select replace(ltree2text(t.code), '.', '_') as code, nlevel(t.code) as lvl, t.name
                                from (select code, name from okato
                                      where code ~ '*{0,%s}'
                                      order by code limit %s) as t;""", (lvl, self.page_rows_limit))

            column_names = [c[0] for c in self.cur.description]
            rows = [dict(zip(column_names, row)) for row in self.cur]  # при сериализации в json порциями возникают ошибки
            self.write({'rows': rows})
        self.flush()


class ManageHandler(Init, RequestHandler):

    def post(self):
        code = self.get_body_argument('code').replace('_', '.')  # из-за ошибки в поиске по селектору
        name = self.get_body_argument('name')
        new_name = self.get_body_argument('new_name')
        if code and name and new_name:
            self.cur.execute("""update okato
                                set name=%s
                                where code=%s and name=%s;""", (new_name, code, name))
            self.conn.commit()
            self.write({'success': True})
        self.flush()

    def delete(self):
        code = self.get_query_argument('code').replace('_', '.')
        name = self.get_query_argument('name')
        if name:
            self.cur.execute("""delete from okato
                                where code=%s and name=%s;""", (code, name))
            self.conn.commit()
            self.write({'success': True})
        self.flush()


class SearchHandler(Init, RequestHandler):

    def get(self):
        # TODO: искать вместе с родителями, чтобы выводилась полная иерархия до искомого элемента
        st = self.get_query_argument('searched_text')
        like_st = '%{}%'.format(st)  # mogrify() не справляется с такой подстановкой
        if st:
            query = self.cur.mogrify("""select replace(ltree2text(code), '.', '_') as code, nlevel(code) as lvl, name
                                        from okato
                                        where code @> (select code from okato
                                                       where name ilike %s
                                                       order by code limit %s)
                                        order by code;""", (like_st, self.page_rows_limit))
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